import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database import Base, get_db
from app.models import Geozone, EvVehicleDetail, ChargingStation
from app.main import app
from app.services.pricing_engine import pricing_engine
from app.services.ev_routing_service import ev_routing_service
from tests.test_pricing_engine import FakeRedis


@pytest_asyncio.fixture
async def api_client():

    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    fake_redis = FakeRedis()
    pricing_engine.redis_client = fake_redis
    ev_routing_service.redis_client = fake_redis

    # Seed initial test data
    async with session_factory() as s:
        z = Geozone(id="zone-downtown", name="Downtown", center_lat=12.9716, center_lng=77.5946, is_active=True)
        ev = EvVehicleDetail(driver_id="driver-ev-100", estimated_range_km=150.0, connector_type="CCS2")
        cs = ChargingStation(
            id="cs-1",
            name="Downtown Supercharger",
            latitude=12.9720,
            longitude=77.5950,
            available_ports=3,
            connector_types="CCS2",
            is_open=True,
        )
        s.add_all([z, ev, cs])
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
    await test_engine.dispose()


@pytest.mark.asyncio
async def test_health_check(api_client):
    res = await api_client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert data["service"] == "transit-ai-service"


@pytest.mark.asyncio
async def test_pricing_compute_endpoint(api_client):
    payload = {
        "zone_id": "zone-downtown",
        "demand_score": 75.0,
        "supply_count": 4,
        "traffic_score": 1.4,
        "weather": "rain",
    }
    res = await api_client.post("/pricing/compute", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert 1.0 <= data["multiplier"] <= 2.5
    assert data["zone_id"] == "zone-downtown"


@pytest.mark.asyncio
async def test_ev_can_complete_endpoint(api_client):
    res = await api_client.post(
        "/ev/can-complete",
        json={"driver_id": "driver-ev-100", "trip_distance_km": 50.0},
    )
    assert res.status_code == 200
    data = res.json()
    # 50km * 1.2 buffer = 60km <= 150km range -> can_complete = True
    assert data["can_complete"] is True
    assert data["battery_after_km"] == 90.0


@pytest.mark.asyncio
async def test_ev_plan_charging_stop_endpoint(api_client):
    res = await api_client.post(
        "/ev/plan-charging-stop",
        json={
            "driver_id": "driver-ev-100",
            "pickup_lat": 12.9710,
            "pickup_lng": 77.5940,
            "dest_lat": 12.9730,
            "dest_lng": 77.5960,
            "ride_id": "ride-abc",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["charging_stop_found"] is True
    assert data["station_id"] == "cs-1"
