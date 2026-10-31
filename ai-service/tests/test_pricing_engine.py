import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database import Base
from app.services.pricing_engine import PricingEngine, MAX_CAP, MIN_CAP, ALPHA


class FakeRedis:
    def __init__(self):
        self.store = {}

    async def get(self, key):
        return self.store.get(key)

    async def setex(self, key, ttl, val):
        self.store[key] = val
        return True


@pytest_asyncio.fixture
async def test_session():

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_pricing_engine_smoothing_and_cap(test_session):
    engine = PricingEngine()
    fake_redis = FakeRedis()
    engine.redis_client = fake_redis

    # Test 1: Normal baseline computation
    res1 = await engine.compute_pricing(
        session=test_session,
        zone_id="zone-1",
        demand_score=50.0,
        supply_count=10,
        traffic_score=1.0,
        weather="clear",
    )
    assert res1["multiplier"] >= 1.0
    assert fake_redis.store.get("pricing:zone:zone-1") is not None

    # Test 2: Extreme spike - should test exponential smoothing (prevents immediate jump)
    res2 = await engine.compute_pricing(
        session=test_session,
        zone_id="zone-1",
        demand_score=100.0,
        supply_count=0,
        traffic_score=3.0,
        weather="storm",
    )
    raw = res2["raw_multiplier"]
    smoothed = res2["multiplier"]

    # Raw should be high due to scarcity and storm
    assert raw > 2.0
    # Smoothed multiplier should be tempered by α = 0.3 smoothing
    expected_smooth = min(MAX_CAP, (ALPHA * raw) + ((1.0 - ALPHA) * res1["multiplier"]))
    assert abs(smoothed - round(expected_smooth, 2)) <= 0.05

    # Test 3: Hard cap at 2.5x even with extreme raw multiplier
    # With previous at 2.5 and extreme conditions, multiplier is capped at MAX_CAP (2.5x)
    fake_redis.store["pricing:zone:zone-extreme:previous"] = "2.50"
    # Seed high custom weights to generate raw > 3.0
    engine.get_pricing_weights = AsyncMock(return_value={
        "demand_weight": 1.5,
        "supply_weight": 1.0,
        "traffic_weight": 0.5,
        "weather_weight": 0.5,
    })
    res3 = await engine.compute_pricing(
        session=test_session,
        zone_id="zone-extreme",
        demand_score=100.0,
        supply_count=0,
        traffic_score=3.0,
        weather="storm",
    )
    assert res3["raw_multiplier"] > 3.0
    assert res3["multiplier"] == MAX_CAP

