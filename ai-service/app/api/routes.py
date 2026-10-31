from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db, engine
from app.services.demand_service import demand_service
from app.services.pricing_engine import pricing_engine
from app.services.ev_routing_service import ev_routing_service
from app.ml.demand_model import demand_engine

router = APIRouter()


class PricingComputeRequest(BaseModel):
    zone_id: str
    demand_score: float = Field(..., ge=0.0, le=100.0)
    supply_count: int = Field(..., ge=0)
    traffic_score: float = Field(default=1.0, ge=0.5, le=3.0)
    weather: str = Field(default="clear")
    time_hour: Optional[int] = Field(default=None, ge=0, le=23)


class EvCanCompleteRequest(BaseModel):
    driver_id: str
    trip_distance_km: float = Field(..., gt=0.0)


class EvPlanChargingStopRequest(BaseModel):
    driver_id: str
    pickup_lat: float
    pickup_lng: float
    dest_lat: float
    dest_lng: float
    ride_id: Optional[str] = None


@router.get("/health")
async def health_check():
    db_ok = True
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    redis_ok = True
    try:
        await pricing_engine.redis_client.ping()
    except Exception:
        redis_ok = False

    return {
        "status": "ok" if (db_ok and redis_ok) else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "redis": "connected" if redis_ok else "unreachable",
        "service": "transit-ai-service",
    }


# 14.2 Demand Prediction Endpoints
@router.get("/predictions/zones/{zone_id}")
async def get_zone_predictions(
    zone_id: str,
    session: AsyncSession = Depends(get_db),
):
    return await demand_service.get_zone_predictions(session, zone_id)


@router.get("/predictions/heatmap")
async def get_predictions_heatmap(
    session: AsyncSession = Depends(get_db),
):
    return await demand_service.get_heatmap_predictions(session)


@router.post("/predictions/run")
async def run_demand_predictions(
    weather: str = "clear",
    is_holiday: bool = False,
    session: AsyncSession = Depends(get_db),
):
    return await demand_service.run_predictions_for_active_zones(
        session,
        weather=weather,
        is_holiday=is_holiday,
    )


# 14.3 Intelligent Pricing Engine Endpoints
@router.post("/pricing/compute")
async def compute_pricing(
    req: PricingComputeRequest,
    session: AsyncSession = Depends(get_db),
):
    return await pricing_engine.compute_pricing(
        session=session,
        zone_id=req.zone_id,
        demand_score=req.demand_score,
        supply_count=req.supply_count,
        traffic_score=req.traffic_score,
        weather=req.weather,
        time_hour=req.time_hour,
    )


@router.post("/pricing/recompute-zones")
async def recompute_active_zones(
    session: AsyncSession = Depends(get_db),
):
    return await pricing_engine.recompute_active_zones(session)


# 14.4 EV-Aware Routing Endpoints
@router.post("/ev/can-complete")
async def check_ev_can_complete(
    req: EvCanCompleteRequest,
    session: AsyncSession = Depends(get_db),
):
    return await ev_routing_service.can_complete_trip(
        session=session,
        driver_id=req.driver_id,
        trip_distance_km=req.trip_distance_km,
    )


@router.post("/ev/plan-charging-stop")
async def plan_ev_charging_stop(
    req: EvPlanChargingStopRequest,
    session: AsyncSession = Depends(get_db),
):
    return await ev_routing_service.plan_charging_stop(
        session=session,
        driver_id=req.driver_id,
        pickup_lat=req.pickup_lat,
        pickup_lng=req.pickup_lng,
        dest_lat=req.dest_lat,
        dest_lng=req.dest_lng,
        ride_id=req.ride_id,
    )


# ML Model Management
@router.post("/ml/train")
async def retrain_model():
    demand_engine.train([])
    return {"status": "trained", "model": "RandomForestRegressor"}
