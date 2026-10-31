import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.config import settings
from app.models import PricingFactor, PricingDecision, Geozone

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS = {
    "demand_weight": 0.45,
    "supply_weight": 0.30,
    "traffic_weight": 0.15,
    "weather_weight": 0.10,
}

WEATHER_FACTORS = {
    "clear": 1.0,
    "cloudy": 1.05,
    "rain": 1.25,
    "storm": 1.45,
}

ALPHA = 0.3  # Exponential smoothing factor
MAX_CAP = 2.5  # Hard cap
MIN_CAP = 1.0  # Floor


class PricingEngine:
    def __init__(self):
        self.redis_client = aioredis.from_url(
            settings.redis_connection_url,
            decode_responses=True,
        )

    async def get_pricing_weights(self, session: AsyncSession) -> Dict[str, float]:
        weights = DEFAULT_WEIGHTS.copy()
        try:
            result = await session.execute(select(PricingFactor).where(PricingFactor.is_active == True))
            factors = result.scalars().all()
            for f in factors:
                weights[f.factor_name] = f.weight
        except Exception as e:
            logger.warning(f"Could not load pricing factors from DB ({e}), using defaults")
        return weights

    async def compute_pricing(
        self,
        session: AsyncSession,
        zone_id: str,
        demand_score: float,
        supply_count: int,
        traffic_score: float = 1.0,
        weather: str = "clear",
        time_hour: Optional[int] = None,
    ) -> Dict[str, Any]:
        weights = await self.get_pricing_weights(session)

        # 1. Compute raw multiplier
        demand_ratio = max(0.0, demand_score / 50.0)
        supply_factor = max(0.7, min(1.8, 10.0 / max(1, supply_count)))
        traffic_factor = max(1.0, traffic_score)
        weather_factor = WEATHER_FACTORS.get(weather.lower(), 1.0)

        raw = (
            1.0
            + (weights["demand_weight"] * (demand_ratio - 1.0))
            + (weights["supply_weight"] * (supply_factor - 1.0))
            + (weights["traffic_weight"] * (traffic_factor - 1.0))
            + (weights["weather_weight"] * (weather_factor - 1.0))
        )
        raw_multiplier = round(max(MIN_CAP, raw), 3)

        # 2. Exponential smoothing: smoothed = α * raw + (1 - α) * previous_smoothed
        previous_key = f"pricing:zone:{zone_id}:previous"
        prev_str = await self.redis_client.get(previous_key)
        previous_smoothed = float(prev_str) if prev_str else 1.0

        smoothed = (ALPHA * raw_multiplier) + ((1.0 - ALPHA) * previous_smoothed)

        # 3. Hard cap at 2.5x (never above this regardless of inputs)
        final_multiplier = round(min(MAX_CAP, max(MIN_CAP, smoothed)), 2)

        # 4. Write PricingDecision row
        decision = PricingDecision(
            zone_id=zone_id,
            demand_score=demand_score,
            supply_count=supply_count,
            traffic_score=traffic_score,
            weather=weather,
            raw_multiplier=raw_multiplier,
            smoothed_multiplier=final_multiplier,
            created_at=datetime.now(timezone.utc),
        )
        session.add(decision)
        await session.commit()

        # 5. Publish to Redis with 60s TTL
        zone_key = f"pricing:zone:{zone_id}"
        payload = {
            "multiplier": final_multiplier,
            "raw_multiplier": raw_multiplier,
            "demand_score": demand_score,
            "supply_count": supply_count,
            "traffic_score": traffic_score,
            "weather": weather,
            "zone_id": zone_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.redis_client.setex(zone_key, 60, json.dumps(payload))
        # Keep previous smoothed multiplier for next round
        await self.redis_client.setex(previous_key, 300, str(final_multiplier))

        return payload


    async def recompute_active_zones(self, session: AsyncSession) -> List[Dict[str, Any]]:
        # Cron every 2 minutes: recompute pricing for all active zones
        result = await session.execute(select(Geozone).where(Geozone.is_active == True))
        zones = result.scalars().all()

        decisions = []
        for zone in zones:
            # Estimate supply from Redis available drivers in zone radius
            supply = 5
            try:
                available = await self.redis_client.geosearch(
                    "drivers:locations",
                    longitude=zone.center_lng,
                    latitude=zone.center_lat,
                    radius=zone.radius_km or 5.0,
                    unit="km",
                )
                supply = len(available) if available else 5
            except Exception:
                pass

            decision = await self.compute_pricing(
                session=session,
                zone_id=zone.id,
                demand_score=60.0,
                supply_count=supply,
                traffic_score=1.1,
                weather="clear",
            )
            decisions.append(decision)

        return decisions


pricing_engine = PricingEngine()
