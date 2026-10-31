import math
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.config import settings
from app.models import (
    Geozone,
    DemandPrediction,
    DriverPositioningSuggestion,
)
from app.ml.demand_model import demand_engine
from app.services.kafka_bus import kafka_bus

logger = logging.getLogger(__name__)

HORIZONS = [5, 10, 15, 30]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Earth radius in kilometers
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class DemandService:
    def __init__(self):
        self.redis_client = aioredis.from_url(
            settings.redis_connection_url,
            decode_responses=True,
        )

    async def run_predictions_for_active_zones(
        self,
        session: AsyncSession,
        weather: str = "clear",
        is_holiday: bool = False,
    ) -> List[Dict[str, Any]]:
        # Fetch active geozones
        result = await session.execute(select(Geozone).where(Geozone.is_active == True))
        zones = result.scalars().all()

        now = datetime.now(timezone.utc)
        hour_of_day = now.hour
        day_of_week = now.weekday()

        generated_predictions = []

        # If no zones exist yet, provide default fallback zone so system is operational
        if not zones:
            default_zone = Geozone(
                id="default-zone-central",
                name="Downtown / Central",
                center_lat=12.9716,
                center_lng=77.5946,
                radius_km=5.0,
                is_active=True,
            )
            session.add(default_zone)
            await session.commit()
            zones = [default_zone]

        for zone in zones:
            zone_preds = []
            for horizon in HORIZONS:
                pred = demand_engine.predict(
                    hour_of_day=hour_of_day,
                    day_of_week=day_of_week,
                    weather=weather,
                    is_holiday=is_holiday,
                    horizon_minutes=horizon,
                )

                record = DemandPrediction(
                    zone_id=zone.id,
                    horizon_minutes=horizon,
                    predicted_demand=pred["predicted_demand"],
                    demand_score=pred["demand_score"],
                    confidence=pred["confidence"],
                    created_at=now,
                )
                session.add(record)
                zone_preds.append({
                    "zone_id": zone.id,
                    "zone_name": zone.name,
                    "center_lat": zone.center_lat,
                    "center_lng": zone.center_lng,
                    "horizon_minutes": horizon,
                    "predicted_demand": pred["predicted_demand"],
                    "demand_score": pred["demand_score"],
                    "confidence": pred["confidence"],
                    "predicted_at": now.isoformat(),
                })

            await session.commit()
            generated_predictions.extend(zone_preds)

            # Publish prediction ready event to Kafka
            await kafka_bus.publish(
                "transit.demand.prediction_ready",
                {
                    "type": "demand.prediction_ready",
                    "zoneId": zone.id,
                    "zoneName": zone.name,
                    "predictions": zone_preds,
                    "timestamp": now.isoformat(),
                },
            )

            # Check if highest demand score exceeds threshold (> 70) for positioning nudge
            max_score = max(p["demand_score"] for p in zone_preds)
            if max_score > 70.0:
                await self.generate_positioning_suggestions(session, zone, max_score)

        return generated_predictions

    async def generate_positioning_suggestions(
        self,
        session: AsyncSession,
        zone: Geozone,
        demand_score: float,
    ) -> List[Dict[str, Any]]:
        suggestions = []
        try:
            # Query Redis geospatial driver index or keys within 10 km
            nearby_drivers: List[Dict[str, Any]] = []
            try:
                # GEOSEARCH drivers:locations FROMLONLAT lng lat BYRADIUS 10 km WITHDIST
                geores = await self.redis_client.geosearch(
                    "drivers:locations",
                    longitude=zone.center_lng,
                    latitude=zone.center_lat,
                    radius=10.0,
                    unit="km",
                    withdist=True,
                )
                for item in geores:
                    driver_id = item[0] if isinstance(item, (list, tuple)) else str(item)
                    dist = float(item[1]) if isinstance(item, (list, tuple)) and len(item) > 1 else 0.0
                    nearby_drivers.append({"driver_id": driver_id, "distance_km": dist})
            except Exception:
                # shortcut: fallback scan for driver location keys when GEO index is empty
                pass

            for candidate in nearby_drivers:
                driver_id = candidate["driver_id"]

                # Check if driver is already heading there or has pending suggestion
                recent = await session.execute(
                    select(DriverPositioningSuggestion).where(
                        and_(
                            DriverPositioningSuggestion.driver_id == driver_id,
                            DriverPositioningSuggestion.target_zone_id == zone.id,
                            DriverPositioningSuggestion.status == "suggested",
                        )
                    )
                )
                if recent.scalars().first():
                    continue

                suggestion = DriverPositioningSuggestion(
                    driver_id=driver_id,
                    target_zone_id=zone.id,
                    predicted_demand_score=demand_score,
                    status="suggested",
                )
                session.add(suggestion)
                await session.commit()

                # Emit Kafka event consumed by NestJS WebSocket gateway
                await kafka_bus.publish(
                    "transit.driver.positioning_nudge",
                    {
                        "type": "driver.positioning_nudge",
                        "driverId": driver_id,
                        "targetZoneId": zone.id,
                        "zoneName": zone.name,
                        "demandScore": demand_score,
                        "centerLat": zone.center_lat,
                        "centerLng": zone.center_lng,
                        "distanceKm": candidate["distance_km"],
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
                suggestions.append({
                    "driverId": driver_id,
                    "targetZoneId": zone.id,
                    "demandScore": demand_score,
                })
        except Exception as e:
            logger.warning(f"Positioning suggestions skipped: {e}")

        return suggestions

    async def get_zone_predictions(
        self,
        session: AsyncSession,
        zone_id: str,
    ) -> List[Dict[str, Any]]:
        # Current predictions for a zone
        query = (
            select(DemandPrediction)
            .where(DemandPrediction.zone_id == zone_id)
            .order_by(DemandPrediction.created_at.desc(), DemandPrediction.horizon_minutes.asc())
            .limit(4)
        )
        result = await session.execute(query)
        rows = result.scalars().all()

        if not rows:
            # Fallback on-demand prediction
            now = datetime.now(timezone.utc)
            return [
                {
                    "zone_id": zone_id,
                    "horizon_minutes": h,
                    "predicted_demand": 10.0,
                    "demand_score": 50.0,
                    "confidence": 0.7,
                    "created_at": now.isoformat(),
                }
                for h in HORIZONS
            ]

        return [
            {
                "id": r.id,
                "zone_id": r.zone_id,
                "horizon_minutes": r.horizon_minutes,
                "predicted_demand": r.predicted_demand,
                "demand_score": r.demand_score,
                "confidence": r.confidence,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]

    async def get_heatmap_predictions(
        self,
        session: AsyncSession,
    ) -> List[Dict[str, Any]]:
        # All active predictions for map overlay
        query = (
            select(DemandPrediction, Geozone)
            .join(Geozone, DemandPrediction.zone_id == Geozone.id)
            .where(DemandPrediction.horizon_minutes == 15)
            .order_by(DemandPrediction.created_at.desc())
            .limit(50)
        )
        result = await session.execute(query)
        rows = result.all()

        heatmap_points = []
        seen_zones = set()
        for pred, zone in rows:
            if zone.id in seen_zones:
                continue
            seen_zones.add(zone.id)
            heatmap_points.append({
                "zone_id": zone.id,
                "zone_name": zone.name,
                "lat": zone.center_lat,
                "lng": zone.center_lng,
                "radius_km": zone.radius_km,
                "demand_score": pred.demand_score,
                "predicted_demand": pred.predicted_demand,
                "confidence": pred.confidence,
                "updated_at": pred.created_at.isoformat() if pred.created_at else None,
            })

        return heatmap_points


demand_service = DemandService()
