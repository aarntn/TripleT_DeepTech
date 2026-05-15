from pathlib import Path

from services.weather_provider import (
    parse_nasa_power_hourly,
    parse_openweather_forecast,
    read_weather_csv,
    write_weather_csv,
)


def test_parse_nasa_power_hourly_normalizes_rows():
    payload = {
        "properties": {
            "parameter": {
                "ALLSKY_SFC_SW_DWN": {"2024070107": 120.0, "2024070108": 420.0},
                "T2M": {"2024070107": 28.5, "2024070108": 29.1},
                "RH2M": {"2024070107": 80.0, "2024070108": 78.0},
                "PRECTOTCORR": {"2024070107": 0.0, "2024070108": 1.2},
            }
        }
    }

    rows = parse_nasa_power_hourly(payload, array_id="A1")

    assert len(rows) == 2
    assert rows[0]["timestamp"] == "2024-07-01T07:00:00+00:00"
    assert rows[0]["array_id"] == "A1"
    assert rows[0]["irradiance_kwh_m2"] == 0.12
    assert rows[0]["cloud_cover_pct"] == 20.0
    assert rows[1]["rainfall_mm"] == 1.2
    assert rows[0]["source"] == "nasa_power"


def test_parse_openweather_forecast_handles_missing_rain():
    payload = {
        "list": [
            {
                "dt": 1720000800,
                "main": {"temp": 31.2, "humidity": 76},
                "clouds": {"all": 42},
            }
        ]
    }

    rows = parse_openweather_forecast(payload, array_id="A1", fallback_irradiance_kwh_m2=3.5)

    assert len(rows) == 1
    assert rows[0]["array_id"] == "A1"
    assert rows[0]["temp_c"] == 31.2
    assert rows[0]["humidity_pct"] == 76.0
    assert rows[0]["cloud_cover_pct"] == 42.0
    assert rows[0]["rainfall_mm"] == 0.0
    assert rows[0]["irradiance_kwh_m2"] == 3.5
    assert rows[0]["source"] == "openweather"


def test_weather_csv_round_trip(tmp_path):
    path = tmp_path / "forecast_weather.csv"
    rows = [
        {
            "timestamp": "2024-07-01T07:00:00+00:00",
            "array_id": "A1",
            "irradiance_kwh_m2": 1.2,
            "temp_c": 30.0,
            "humidity_pct": 75.0,
            "cloud_cover_pct": 20.0,
            "rainfall_mm": 0.0,
            "source": "test",
        }
    ]

    write_weather_csv(rows, path)
    loaded = read_weather_csv(Path(path), array_id="A1")

    assert loaded == rows
