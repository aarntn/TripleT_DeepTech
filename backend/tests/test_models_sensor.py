import pytest
from pydantic import ValidationError
from models.sensor import ClassifyRequest, ClassifyResponse, SensorReading, ForecastPoint


def test_classify_request_valid():
    req = ClassifyRequest(
        array_id="A1",
        efficiency_pct=75.0,
        irradiance_kwh_m2=3.2,
        cloud_cover_pct=20.0,
        humidity_pct=80.0,
        rainfall_mm=0.0,
        soiling_loss_pct=22.0,
    )
    assert req.array_id == "A1"
    assert req.efficiency_pct == 75.0


def test_classify_request_rejects_efficiency_over_100():
    with pytest.raises(ValidationError):
        ClassifyRequest(
            array_id="A1",
            efficiency_pct=150.0,
            irradiance_kwh_m2=3.2,
            cloud_cover_pct=20.0,
            humidity_pct=80.0,
            rainfall_mm=0.0,
            soiling_loss_pct=22.0,
        )


def test_classify_request_rejects_negative_rainfall():
    with pytest.raises(ValidationError):
        ClassifyRequest(
            array_id="A1",
            efficiency_pct=80.0,
            irradiance_kwh_m2=3.2,
            cloud_cover_pct=20.0,
            humidity_pct=80.0,
            rainfall_mm=-1.0,
            soiling_loss_pct=22.0,
        )


def test_classify_request_rejects_unrealistic_numeric_inputs():
    invalid_values = [
        {"irradiance_kwh_m2": 21.0},
        {"rainfall_mm": 501.0},
        {"soiling_loss_pct": 101.0},
        {"humidity_pct": float("inf")},
        {"cloud_cover_pct": float("nan")},
    ]

    for override in invalid_values:
        data = {
            "array_id": "A1",
            "efficiency_pct": 80.0,
            "irradiance_kwh_m2": 3.2,
            "cloud_cover_pct": 20.0,
            "humidity_pct": 80.0,
            "rainfall_mm": 0.0,
            "soiling_loss_pct": 22.0,
        }
        data.update(override)
        with pytest.raises(ValidationError):
            ClassifyRequest(**data)


def test_classify_request_rejects_invalid_array_id():
    with pytest.raises(ValidationError):
        ClassifyRequest(
            array_id="AA",
            efficiency_pct=80.0,
            irradiance_kwh_m2=3.2,
            cloud_cover_pct=20.0,
            humidity_pct=80.0,
            rainfall_mm=0.0,
            soiling_loss_pct=22.0,
        )


def test_classify_request_rejects_extra_fields():
    with pytest.raises(ValidationError):
        ClassifyRequest(
            array_id="A1",
            efficiency_pct=80.0,
            irradiance_kwh_m2=3.2,
            cloud_cover_pct=20.0,
            humidity_pct=80.0,
            rainfall_mm=0.0,
            soiling_loss_pct=22.0,
            unexpected="value",
        )


def test_forecast_point_bounds_integrity():
    point = ForecastPoint(
        date="Day 8",
        forecast_efficiency_pct=70.0,
        forecast_revenue_rm=1234.56,
        lower_bound=65.0,
        upper_bound=75.0,
    )
    assert point.lower_bound < point.upper_bound


def test_classify_response_fields():
    resp = ClassifyResponse(type="dust", confidence=0.91, cause="Dust confirmed.")
    assert resp.type == "dust"
    assert 0 <= resp.confidence <= 1
