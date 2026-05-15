import pytest
from services.forecaster import forecast

_REQUIRED_KEYS = {"date", "forecast_efficiency_pct", "forecast_revenue_rm", "lower_bound", "upper_bound"}


def test_forecast_returns_three_points():
    result = forecast("A1", days=3)
    assert len(result) == 3


def test_forecast_has_required_keys():
    result = forecast("A1")
    for point in result:
        assert set(point.keys()) == _REQUIRED_KEYS


def test_forecast_efficiency_in_bounds():
    result = forecast("A1")
    for point in result:
        assert 0 <= point["forecast_efficiency_pct"] <= 100


def test_forecast_bounds_ordered():
    result = forecast("A1")
    for point in result:
        assert point["lower_bound"] <= point["forecast_efficiency_pct"] <= point["upper_bound"]


def test_forecast_revenue_non_negative():
    result = forecast("A1")
    for point in result:
        assert point["forecast_revenue_rm"] >= 0


def test_forecast_unknown_array_returns_safe_default():
    result = forecast("ZZ", days=3)
    assert len(result) == 3
    for point in result:
        assert point["forecast_efficiency_pct"] == 85.0


def test_forecast_custom_days():
    result = forecast("B1", days=2)
    assert len(result) == 2


def test_forecast_prefers_real_weather_rows(monkeypatch):
    calls = []

    def fake_weather(array_id, days, fallback_irradiance_kwh_m2=0.0):
        calls.append((array_id, days, fallback_irradiance_kwh_m2))
        return [
            {
                "timestamp": "2024-07-08T07:00:00+00:00",
                "array_id": array_id,
                "irradiance_kwh_m2": 2.0,
                "temp_c": 30.0,
                "humidity_pct": 70.0,
                "cloud_cover_pct": 10.0,
                "rainfall_mm": 0.0,
                "source": "test",
            },
            {
                "timestamp": "2024-07-09T07:00:00+00:00",
                "array_id": array_id,
                "irradiance_kwh_m2": 1.5,
                "temp_c": 29.0,
                "humidity_pct": 85.0,
                "cloud_cover_pct": 70.0,
                "rainfall_mm": 3.0,
                "source": "test",
            },
        ]

    monkeypatch.setattr("services.forecaster.get_weather_forecast", fake_weather)

    result = forecast("A1", days=2)

    assert len(result) == 2
    assert calls == [("A1", 2, 0.0)]
