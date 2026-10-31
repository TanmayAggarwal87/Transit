import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from typing import Dict, Any, List, Optional

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
MODEL_PATH = os.path.join(MODEL_DIR, "demand_rf_model.joblib")

WEATHER_MAP = {"clear": 0, "cloudy": 1, "rain": 2, "storm": 3}

# SQL query extracting historical demand features from rides table
RIDES_FEATURE_QUERY = """
SELECT 
    EXTRACT(HOUR FROM created_at)::int AS hour_of_day,
    EXTRACT(DOW FROM created_at)::int AS day_of_week,
    COUNT(id)::int AS ride_count
FROM rides
WHERE created_at IS NOT NULL
GROUP BY hour_of_day, day_of_week
ORDER BY day_of_week, hour_of_day;
"""


class DemandPredictionEngine:
    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
        self.model: Optional[RandomForestRegressor] = None
        self._load_or_init()

    def _load_or_init(self) -> None:
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
            except Exception:
                self.model = None

    def _extract_features(self, df: pd.DataFrame) -> np.ndarray:
        # Features: [hour_of_day, day_of_week, is_weekend, weather_code, is_holiday]
        hours = df["hour_of_day"].values
        dows = df["day_of_week"].values
        is_weekend = np.isin(dows, [0, 6]).astype(int)
        weather = df.get("weather", pd.Series(["clear"] * len(df))).map(
            lambda w: WEATHER_MAP.get(str(w).lower(), 0)
        ).values
        is_holiday = df.get("is_holiday", pd.Series([False] * len(df))).astype(int).values

        return np.column_stack([hours, dows, is_weekend, weather, is_holiday])

    def train(self, training_data: List[Dict[str, Any]]) -> None:
        if not training_data:
            # Generate baseline bootstrap data if database is fresh
            training_data = self._generate_synthetic_baseline()

        df = pd.DataFrame(training_data)
        X = self._extract_features(df)
        y = df["ride_count"].values

        rf = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42)
        rf.fit(X, y)

        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(rf, self.model_path)
        self.model = rf

    def predict(
        self,
        hour_of_day: int,
        day_of_week: int,
        weather: str = "clear",
        is_holiday: bool = False,
        horizon_minutes: int = 15,
    ) -> Dict[str, float]:
        # shortcut: adjust target hour by horizon projection, upgrade to multi-horizon LSTM when data grows
        effective_hour = (hour_of_day + (horizon_minutes // 60)) % 24
        weather_code = WEATHER_MAP.get(weather.lower(), 0)
        is_weekend = 1 if day_of_week in [0, 6] else 0

        features = np.array([[effective_hour, day_of_week, is_weekend, weather_code, int(is_holiday)]])

        if self.model is not None:
            predicted_rides = float(max(0.0, self.model.predict(features)[0]))
        else:
            # Fallback heuristic: morning peak (8-10) and evening peak (17-20)
            is_peak = effective_hour in [8, 9, 10, 17, 18, 19, 20]
            base = 15.0 if is_peak else 5.0
            if weather_code >= 2:
                base *= 1.3  # Rain increases taxi demand
            predicted_rides = base

        # Demand score normalized from 0 to 100 (assuming 30 rides/15min is 100% capacity)
        demand_score = float(min(100.0, max(0.0, (predicted_rides / 25.0) * 100.0)))
        confidence = 0.88 if self.model is not None else 0.65

        return {
            "predicted_demand": round(predicted_rides, 2),
            "demand_score": round(demand_score, 1),
            "confidence": confidence,
            "horizon_minutes": horizon_minutes,
        }

    def _generate_synthetic_baseline(self) -> List[Dict[str, Any]]:
        # Generates realistic synthetic baseline covering 7 days x 24 hours
        data = []
        for dow in range(7):
            for hr in range(24):
                is_rush = hr in [8, 9, 10, 17, 18, 19, 20]
                base_count = 18 if is_rush else 6
                if dow in [5, 6] and 12 <= hr <= 23:
                    base_count += 5
                data.append({
                    "hour_of_day": hr,
                    "day_of_week": dow,
                    "ride_count": float(base_count),
                    "weather": "clear",
                    "is_holiday": False,
                })
        return data


demand_engine = DemandPredictionEngine()
