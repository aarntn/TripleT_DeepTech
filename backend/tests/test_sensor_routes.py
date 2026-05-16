from fastapi.testclient import TestClient

from main import app  # noqa: E402

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer test-api-key"}


def test_classify_valid_dust_reading():
    response = client.post(
        "/api/sensor/classify",
        headers=AUTH_HEADERS,
        json={
            "array_id": "A1",
            "efficiency_pct": 65.0,
            "irradiance_kwh_m2": 3.5,
            "cloud_cover_pct": 15.0,
            "humidity_pct": 75.0,
            "rainfall_mm": 0.0,
            "soiling_loss_pct": 32.0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] in {"dust", "weather", "normal"}
    assert "confidence" in data
    assert "cause" in data


def test_classify_invalid_efficiency_returns_422():
    response = client.post(
        "/api/sensor/classify",
        headers=AUTH_HEADERS,
        json={
            "array_id": "A1",
            "efficiency_pct": 200.0,
            "irradiance_kwh_m2": 3.5,
            "cloud_cover_pct": 15.0,
            "humidity_pct": 75.0,
            "rainfall_mm": 0.0,
            "soiling_loss_pct": 32.0,
        },
    )
    assert response.status_code == 422


def test_classify_rejects_non_finite_raw_json_without_500():
    client_no_raise = TestClient(app, raise_server_exceptions=False)
    payload = (
        '{"array_id":"A1","efficiency_pct":NaN,"irradiance_kwh_m2":3.5,'
        '"cloud_cover_pct":15,"humidity_pct":75,"rainfall_mm":0,"soiling_loss_pct":32}'
    )
    response = client_no_raise.post(
        "/api/sensor/classify",
        headers={**AUTH_HEADERS, "Content-Type": "application/json"},
        content=payload,
    )
    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "INVALID_REQUEST", "message": "Request body is invalid."}
    }


def test_classify_rejects_huge_numeric_input():
    response = client.post(
        "/api/sensor/classify",
        headers=AUTH_HEADERS,
        json={
            "array_id": "A1",
            "efficiency_pct": 65.0,
            "irradiance_kwh_m2": 1e308,
            "cloud_cover_pct": 15.0,
            "humidity_pct": 75.0,
            "rainfall_mm": 0.0,
            "soiling_loss_pct": 32.0,
        },
    )
    assert response.status_code == 422


def test_get_latest_returns_six_arrays():
    response = client.get("/api/sensor/latest", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    assert {row["array_id"] for row in data} == {"A1", "A2", "B1", "B2", "C1", "C2"}


def test_get_latest_reading_has_required_fields():
    response = client.get("/api/sensor/latest", headers=AUTH_HEADERS)
    row = response.json()[0]
    for field in ["array_id", "efficiency_pct", "dust_flag", "rainfall_mm", "timestamp"]:
        assert field in row


def test_get_history_returns_demo_sensor_rows():
    response = client.get("/api/sensor/history", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 6
    assert {row["array_id"] for row in data} == {"A1", "A2", "B1", "B2", "C1", "C2"}


def test_forecast_a1_returns_three_points():
    response = client.get("/api/forecast/A1", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert "forecast_efficiency_pct" in data[0]
    assert "lower_bound" in data[0]


def test_forecast_unknown_array_returns_generic_404():
    response = client.get("/api/forecast/Z9", headers=AUTH_HEADERS)
    assert response.status_code == 404
    assert response.json() == {"error": {"code": "NOT_FOUND", "message": "Array not found."}}


def test_forecast_invalid_array_format_returns_422():
    response = client.get("/api/forecast/ZZ", headers=AUTH_HEADERS)
    assert response.status_code == 422


def test_weather_forecast_endpoint_returns_normalized_rows(monkeypatch):
    monkeypatch.setattr(
        "api.routes.weather.get_weather_forecast",
        lambda array_id, days: [
            {
                "timestamp": "2024-07-08T07:00:00+00:00",
                "array_id": array_id,
                "irradiance_kwh_m2": 1.2,
                "temp_c": 30.0,
                "humidity_pct": 75.0,
                "cloud_cover_pct": 20.0,
                "rainfall_mm": 0.0,
                "source": "test",
            }
        ],
    )

    response = client.get("/api/weather/forecast/A1", headers=AUTH_HEADERS)

    assert response.status_code == 200
    data = response.json()
    assert data[0]["array_id"] == "A1"
    assert data[0]["source"] == "test"
