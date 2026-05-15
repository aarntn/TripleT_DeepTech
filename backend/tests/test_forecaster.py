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
