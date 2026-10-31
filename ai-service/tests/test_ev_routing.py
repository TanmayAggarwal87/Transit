import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database import Base
from app.models import EvVehicleDetail, ChargingStation, ChargingStop
from app.services.ev_routing_service import EvRoutingService
from tests.test_pricing_engine import FakeRedis


@pytest_asyncio.fixture
async def ev_session():

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_can_complete_trip_buffer(ev_session):
    service = EvRoutingService()
    fake_redis = FakeRedis()
    service.redis_client = fake_redis

    # Seed EV detail: 100 km range
    driver_id = "driver-ev-1"
    ev_detail = EvVehicleDetail(
        driver_id=driver_id,
        battery_capacity_kwh=40.0,
        estimated_range_km=100.0,
        connector_type="CCS2",
    )
    ev_session.add(ev_detail)
    await ev_session.commit()

    # Case A: trip distance = 80 km. With 20% buffer, range needed = 80 * 1.2 = 96 km <= 100 km -> True
    res_a = await service.can_complete_trip(ev_session, driver_id, 80.0)
    assert res_a["can_complete"] is True
    assert res_a["range_needed"] == 96.0
    assert res_a["battery_after_km"] == 4.0

    # Case B: trip distance = 85 km. With 20% buffer, range needed = 85 * 1.2 = 102 km > 100 km -> False
    res_b = await service.can_complete_trip(ev_session, driver_id, 85.0)
    assert res_b["can_complete"] is False
    assert res_b["range_needed"] == 102.0


@pytest.mark.asyncio
async def test_plan_charging_stop_selection(ev_session):
    service = EvRoutingService()
    fake_redis = FakeRedis()
    service.redis_client = fake_redis

    driver_id = "driver-ev-2"
    ev_detail = EvVehicleDetail(
        driver_id=driver_id,
        battery_capacity_kwh=50.0,
        estimated_range_km=50.0,
        connector_type="CCS2",
    )
    ev_session.add(ev_detail)

    # Route: Bangalore Indiranagar (12.9784, 77.6408) to Electronic City (12.8399, 77.6770)
    # Midpoint is approx (12.909, 77.658)
    pickup_lat, pickup_lng = 12.9784, 77.6408
    dest_lat, dest_lng = 12.8399, 77.6770

    # Station 1: ~0.5 km from midpoint, CCS2, open, 2 ports available
    st1 = ChargingStation(
        id="station-optimal",
        name="Koramangala Fast Charger",
        latitude=12.9120,
        longitude=77.6590,
        available_ports=2,
        connector_types="CCS2,Type 2",
        is_open=True,
    )

    # Station 2: 5 km away (outside 2km limit)
    st2 = ChargingStation(
        id="station-far",
        name="Far Away Station",
        latitude=12.9600,
        longitude=77.6000,
        available_ports=4,
        connector_types="CCS2",
        is_open=True,
    )

    # Station 3: near midpoint but closed
    st3 = ChargingStation(
        id="station-closed",
        name="Closed Station",
        latitude=12.9100,
        longitude=77.6580,
        available_ports=4,
        connector_types="CCS2",
        is_open=False,
    )

    # Station 4: near midpoint, open, but incompatible connector (CHAdeMO only)
    st4 = ChargingStation(
        id="station-incompatible",
        name="Incompatible Station",
        latitude=12.9110,
        longitude=77.6585,
        available_ports=4,
        connector_types="CHAdeMO",
        is_open=True,
    )

    ev_session.add_all([st1, st2, st3, st4])
    await ev_session.commit()

    plan = await service.plan_charging_stop(
        session=ev_session,
        driver_id=driver_id,
        pickup_lat=pickup_lat,
        pickup_lng=pickup_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        ride_id="ride-123",
    )

    assert plan["charging_stop_found"] is True
    assert plan["station_id"] == "station-optimal"
    assert "modified_route" in plan
    assert plan["detour_distance_km"] >= 0.0
