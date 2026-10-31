import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Index,
    Integer,
    String,
    Text,
)
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Geozone(Base):
    __tablename__ = "geozones"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    radius_km = Column(Float, default=5.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class DemandPrediction(Base):
    __tablename__ = "demand_predictions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    zone_id = Column(String(36), nullable=False, index=True)
    horizon_minutes = Column(Integer, nullable=False)  # 5, 10, 15, 30 min
    predicted_demand = Column(Float, nullable=False)  # ride count estimate
    demand_score = Column(Float, nullable=False)  # 0 to 100
    confidence = Column(Float, default=0.85)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)

    __table_args__ = (
        Index("idx_demand_zone_created", "zone_id", "created_at"),
    )


class HistoricalRidePattern(Base):
    __tablename__ = "historical_ride_patterns"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    zone_id = Column(String(36), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday ... 6=Sunday
    hour_of_day = Column(Integer, nullable=False)  # 0 to 23
    avg_demand = Column(Float, default=0.0)
    weather = Column(String(32), default="clear")
    is_holiday = Column(Boolean, default=False)


class PricingFactor(Base):
    __tablename__ = "pricing_factors"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    factor_name = Column(String(64), unique=True, nullable=False)
    weight = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)


class PricingDecision(Base):
    __tablename__ = "pricing_decisions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    zone_id = Column(String(36), nullable=False, index=True)
    demand_score = Column(Float, nullable=False)
    supply_count = Column(Integer, default=0)
    traffic_score = Column(Float, default=1.0)
    weather = Column(String(32), default="clear")
    raw_multiplier = Column(Float, nullable=False)
    smoothed_multiplier = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)


class DriverPositioningSuggestion(Base):
    __tablename__ = "driver_positioning_suggestions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    driver_id = Column(String(36), nullable=False, index=True)
    target_zone_id = Column(String(36), nullable=False)
    predicted_demand_score = Column(Float, nullable=False)
    status = Column(String(20), default="suggested")  # suggested, accepted, rejected, expired
    created_at = Column(DateTime(timezone=True), default=utcnow)


class EvVehicleDetail(Base):
    __tablename__ = "ev_vehicle_details"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    driver_id = Column(String(36), unique=True, nullable=False, index=True)
    battery_capacity_kwh = Column(Float, default=50.0)
    battery_level_percent = Column(Float, default=100.0)
    estimated_range_km = Column(Float, default=250.0)
    connector_type = Column(String(32), default="CCS2")  # CCS2, Type 2, CHAdeMO
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ChargingStation(Base):
    __tablename__ = "charging_stations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(120), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    available_ports = Column(Integer, default=4)
    connector_types = Column(String(120), default="CCS2,Type 2")
    is_open = Column(Boolean, default=True)
    power_kw = Column(Float, default=50.0)


class ChargingStop(Base):
    __tablename__ = "charging_stops"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    ride_id = Column(String(36), nullable=True, index=True)
    driver_id = Column(String(36), nullable=False, index=True)
    station_id = Column(String(36), nullable=False)
    station_name = Column(String(120), nullable=False)
    detour_distance_km = Column(Float, default=0.0)
    estimated_charging_time_min = Column(Float, default=20.0)
    created_at = Column(DateTime(timezone=True), default=utcnow)

