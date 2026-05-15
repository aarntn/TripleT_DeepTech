import pytest
from fastapi.testclient import TestClient

# Ensure model is trained before app is imported (train_and_save is idempotent)
from services.dust_classifier import train_and_save
train_and_save()

from main import app  # noqa: E402

client = TestClient(app)


def test_classify_valid_dust_reading():
    response = client.post("/api/sensor/classify", json={
        "array_id": "A1",
        "efficiency_pct": 65.0,
        "irradiance_kwh_m2": 3.5,
        "cloud_cover_pct": 15.0,
        "humidity_pct": 75.0,
        "rainfall_mm": 0.0,
        "soiling_loss_pct": 32.0,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["type"] in {"dust", "weather", "normal"}
    assert "confidence" in data
    assert "cause" in data


def test_classify_invalid_efficiency_returns_422():
    response = client.post("/api/sensor/classify", json={
        "array_id": "A1",
        "efficiency_pct": 200.0,
        "irradiance_kwh_m2": 3.5,
        "cloud_cover_pct": 15.0,
        "humidity_pct": 75.0,
        "rainfall_mm": 0.0,
        "soiling_loss_pct": 32.0,
    })
    assert response.status_code == 422


def test_get_latest_returns_six_arrays():
    response = client.get("/api/sensor/latest")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    assert {row["array_id"] for row in data} == {"A1", "A2", "B1", "B2", "C1", "C2"}


def test_get_latest_reading_has_required_fields():
    response = client.get("/api/sensor/latest")
    row = response.json()[0]
    for field in ["array_id", "efficiency_pct", "dust_flag", "rainfall_mm", "timestamp"]:
        assert field in row


def test_forecast_a1_returns_three_points():
    response = client.get("/api/forecast/A1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert "forecast_efficiency_pct" in data[0]
    assert "lower_bound" in data[0]


def test_forecast_invalid_array_returns_404():
    response = client.get("/api/forecast/ZZ")
    assert response.status_code == 404
