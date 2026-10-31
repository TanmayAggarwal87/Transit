import logging
from typing import Dict, Any, Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.config import settings
from app.models import EvVehicleDetail, ChargingStation, ChargingStop
from app.services.demand_service import haversine_km

logger = logging.getLogger(__name__)


class EvRoutingService:
    def __init__(self):
        self.redis_client = aioredis.from_url(
            settings.redis_connection_url,
            decode_responses=True,
        )

    async def can_complete_trip(
        self,
        session: AsyncSession,
        driver_id: str,
        trip_distance_km: float,
    ) -> Dict[str, Any]:
        # 1. Fetch estimated range from Redis or DB
        range_str = await self.redis_client.get(f"driver:{driver_id}:ev_range")
        if range_str is not None:
            estimated_range_km = float(range_str)
        else:
            result = await session.execute(
                select(EvVehicleDetail).where(EvVehicleDetail.driver_id == driver_id)
            )
            detail = result.scalars().first()
            estimated_range_km = detail.estimated_range_km if detail else 200.0

        # 2. Add 20% safety buffer: range_needed = tripDistance * 1.2
        range_needed = round(trip_distance_km * 1.2, 2)
        can_complete = estimated_range_km >= range_needed
        battery_after_km = round(max(0.0, estimated_range_km - range_needed), 2)

        return {
            "can_complete": can_complete,
            "battery_after_km": battery_after_km,
            "estimated_range_km": round(estimated_range_km, 2),
            "range_needed": range_needed,
            "trip_distance_km": round(trip_distance_km, 2),
        }

    async def plan_charging_stop(
        self,
        session: AsyncSession,
        driver_id: str,
        pickup_lat: float,
        pickup_lng: float,
        dest_lat: float,
        dest_lng: float,
        ride_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Midpoint of pickup and destination
        mid_lat = (pickup_lat + dest_lat) / 2.0
        mid_lng = (pickup_lng + dest_lng) / 2.0
        direct_dist = haversine_km(pickup_lat, pickup_lng, dest_lat, dest_lng)

        # Get driver EV connector type
        result = await session.execute(
            select(EvVehicleDetail).where(EvVehicleDetail.driver_id == driver_id)
        )
        ev_detail = result.scalars().first()
        driver_connector = ev_detail.connector_type if ev_detail else "CCS2"

        # Query charging stations: open, available ports > 0
        stations_query = select(ChargingStation).where(
            and_(
                ChargingStation.is_open == True,
                ChargingStation.available_ports > 0,
            )
        )
        stations_res = await session.execute(stations_query)
        candidate_stations = stations_res.scalars().all()

        best_station: Optional[ChargingStation] = None
        min_detour = float("inf")

        for station in candidate_stations:
            # Check connector compatibility
            station_connectors = [c.strip().upper() for c in station.connector_types.split(",")]
            if driver_connector.upper() not in station_connectors:
                continue

            # Check distance to midpoint within 2.0 km
            dist_to_mid = haversine_km(mid_lat, mid_lng, station.latitude, station.longitude)
            if dist_to_mid > 2.0:
                continue

            # Calculate detour distance: (dist(pickup, st) + dist(st, dest)) - direct_dist
            d1 = haversine_km(pickup_lat, pickup_lng, station.latitude, station.longitude)
            d2 = haversine_km(station.latitude, station.longitude, dest_lat, dest_lng)
            detour = max(0.0, (d1 + d2) - direct_dist)

            if detour < min_detour:
                min_detour = detour
                best_station = station

        if not best_station:
            return {
                "charging_stop_found": False,
                "message": "No compatible charging station with available ports within 2km of midpoint",
            }

        # Create ChargingStop record
        charging_stop = ChargingStop(
            ride_id=ride_id,
            driver_id=driver_id,
            station_id=best_station.id,
            station_name=best_station.name,
            detour_distance_km=round(min_detour, 2),
            estimated_charging_time_min=20.0,
        )
        session.add(charging_stop)
        await session.commit()

        return {
            "charging_stop_found": True,
            "station_id": best_station.id,
            "station_name": best_station.name,
            "detour_distance_km": round(min_detour, 2),
            "estimated_charging_time_min": 20.0,
            "modified_route": {
                "pickup": {"lat": pickup_lat, "lng": pickup_lng},
                "charging_stop": {
                    "station_id": best_station.id,
                    "name": best_station.name,
                    "lat": best_station.latitude,
                    "lng": best_station.longitude,
                    "available_ports": best_station.available_ports,
                },
                "destination": {"lat": dest_lat, "lng": dest_lng},
            },
        }


ev_routing_service = EvRoutingService()
