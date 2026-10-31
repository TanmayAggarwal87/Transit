import os
import pytest
from app.ml.demand_model import DemandPredictionEngine, WEATHER_MAP


def test_demand_engine_training_and_prediction(tmp_path):
    model_file = str(tmp_path / "test_rf.joblib")
    engine = DemandPredictionEngine(model_path=model_file)

    # Train on synthetic data
    sample_data = [
        {"hour_of_day": 8, "day_of_week": 1, "ride_count": 22.0, "weather": "clear", "is_holiday": False},
        {"hour_of_day": 9, "day_of_week": 1, "ride_count": 25.0, "weather": "clear", "is_holiday": False},
        {"hour_of_day": 14, "day_of_week": 1, "ride_count": 8.0, "weather": "clear", "is_holiday": False},
        {"hour_of_day": 18, "day_of_week": 1, "ride_count": 30.0, "weather": "rain", "is_holiday": False},
        {"hour_of_day": 2, "day_of_week": 1, "ride_count": 2.0, "weather": "clear", "is_holiday": False},
    ]

    engine.train(sample_data)

    assert os.path.exists(model_file)
    assert engine.model is not None

    # Predict rush hour vs late night
    rush_pred = engine.predict(hour_of_day=18, day_of_week=1, weather="rain", horizon_minutes=15)
    night_pred = engine.predict(hour_of_day=2, day_of_week=1, weather="clear", horizon_minutes=15)

    assert rush_pred["predicted_demand"] > night_pred["predicted_demand"]
    assert 0.0 <= rush_pred["demand_score"] <= 100.0
    assert 0.0 <= night_pred["demand_score"] <= 100.0
    assert rush_pred["horizon_minutes"] == 15
    assert rush_pred["confidence"] > 0.8


def test_demand_engine_fallback_when_uninitialized(tmp_path):
    empty_file = str(tmp_path / "non_existent.joblib")
    engine = DemandPredictionEngine(model_path=empty_file)

    pred = engine.predict(hour_of_day=9, day_of_week=2, weather="clear")
    assert pred["predicted_demand"] > 0
    assert 0.0 <= pred["demand_score"] <= 100.0
