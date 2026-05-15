import csv
import json
import logging
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.security import sanitize_log_value

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parents[2] / "data"
DEFAULT_PROCESSED_WEATHER_PATH = DATA_DIR / "processed" / "weather" / "forecast_weather.csv"
NASA_POWER_HOURLY_URL = "https://power.larc.nasa.gov/api/temporal/hourly/point"
OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
NASA_POWER_PARAMETERS = ("ALLSKY_SFC_SW_DWN", "T2M", "RH2M", "PRECTOTCORR")


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    if parsed <= -900:
        return default
    return parsed


def _timestamp_from_power_key(key: str) -> str:
    return datetime.strptime(key, "%Y%m%d%H").replace(tzinfo=timezone.utc).isoformat()


def _timestamp_from_unix(value: Any) -> str:
    return datetime.fromtimestamp(int(value), tz=timezone.utc).isoformat()


def _fetch_json(url: str, timeout: float = 15.0) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "solarguard-weather/1.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def parse_nasa_power_hourly(
    payload: dict,
    array_id: str = "A1",
    default_cloud_cover_pct: float = 20.0,
) -> list[dict]:
    parameters = payload.get("properties", {}).get("parameter", {})
    irradiance = parameters.get("ALLSKY_SFC_SW_DWN", {})
    temperature = parameters.get("T2M", {})
    humidity = parameters.get("RH2M", {})
    precipitation = parameters.get("PRECTOTCORR", {})

    rows = []
    for key in sorted(irradiance):
        # POWER hourly ALLSKY_SFC_SW_DWN is returned on a Wh/m2 scale; normalize to kWh/m2.
        irradiance_kwh_m2 = _as_float(irradiance.get(key)) / 1000.0
        rows.append({
            "timestamp": _timestamp_from_power_key(key),
            "array_id": array_id,
            "irradiance_kwh_m2": round(irradiance_kwh_m2, 4),
            "temp_c": round(_as_float(temperature.get(key)), 2),
            "humidity_pct": round(_as_float(humidity.get(key)), 2),
            "cloud_cover_pct": round(default_cloud_cover_pct, 2),
            "rainfall_mm": round(_as_float(precipitation.get(key)), 4),
            "source": "nasa_power",
        })
    return rows


def parse_openweather_forecast(
    payload: dict,
    array_id: str = "A1",
    fallback_irradiance_kwh_m2: float = 0.0,
) -> list[dict]:
    rows = []
    for item in payload.get("list", []):
        rows.append({
            "timestamp": _timestamp_from_unix(item.get("dt")),
            "array_id": array_id,
            "irradiance_kwh_m2": round(fallback_irradiance_kwh_m2, 4),
            "temp_c": round(_as_float(item.get("main", {}).get("temp")), 2),
            "humidity_pct": round(_as_float(item.get("main", {}).get("humidity")), 2),
            "cloud_cover_pct": round(_as_float(item.get("clouds", {}).get("all")), 2),
            "rainfall_mm": round(_as_float(item.get("rain", {}).get("3h")), 4),
            "source": "openweather",
        })
    return rows


def write_weather_csv(rows: list[dict], path: Path) -> None:
    if not rows:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def read_weather_csv(path: Path, array_id: str | None = None) -> list[dict]:
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    if array_id:
        rows = [row for row in rows if row.get("array_id") == array_id]
    return [
        {
            "timestamp": row["timestamp"],
            "array_id": row.get("array_id", array_id or "A1"),
            "irradiance_kwh_m2": _as_float(row.get("irradiance_kwh_m2")),
            "temp_c": _as_float(row.get("temp_c")),
            "humidity_pct": _as_float(row.get("humidity_pct")),
            "cloud_cover_pct": _as_float(row.get("cloud_cover_pct"), 20.0),
            "rainfall_mm": _as_float(row.get("rainfall_mm")),
            "source": row.get("source", "processed_weather"),
        }
        for row in rows
    ]


def fetch_nasa_power_history(
    lat: float,
    lon: float,
    start: str,
    end: str,
    array_id: str = "A1",
    timeout: float = 15.0,
) -> list[dict]:
    query = urllib.parse.urlencode({
        "parameters": ",".join(NASA_POWER_PARAMETERS),
        "community": "RE",
        "longitude": lon,
        "latitude": lat,
        "start": start,
        "end": end,
        "format": "JSON",
        "time-standard": "UTC",
    })
    payload = _fetch_json(f"{NASA_POWER_HOURLY_URL}?{query}", timeout=timeout)
    return parse_nasa_power_hourly(payload, array_id=array_id)


def fetch_openweather_forecast(
    lat: float,
    lon: float,
    api_key: str,
    array_id: str = "A1",
    fallback_irradiance_kwh_m2: float = 0.0,
    timeout: float = 15.0,
) -> list[dict]:
    query = urllib.parse.urlencode({
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric",
    })
    payload = _fetch_json(f"{OPENWEATHER_FORECAST_URL}?{query}", timeout=timeout)
    return parse_openweather_forecast(
        payload,
        array_id=array_id,
        fallback_irradiance_kwh_m2=fallback_irradiance_kwh_m2,
    )


def _weather_processed_path() -> Path:
    configured = os.getenv("WEATHER_PROCESSED_PATH")
    if configured:
        return Path(configured)
    return DEFAULT_PROCESSED_WEATHER_PATH


def get_weather_forecast(
    array_id: str = "A1",
    days: int = 3,
    fallback_irradiance_kwh_m2: float = 0.0,
) -> list[dict]:
    provider = os.getenv("WEATHER_PROVIDER", "synthetic").strip().lower()
    lat = _as_float(os.getenv("WEATHER_LAT"), 3.139)
    lon = _as_float(os.getenv("WEATHER_LON"), 101.6869)
    api_key = os.getenv("OPENWEATHER_API_KEY", "")

    if provider in {"openweather", "auto"} and api_key:
        try:
            rows = fetch_openweather_forecast(
                lat=lat,
                lon=lon,
                api_key=api_key,
                array_id=array_id,
                fallback_irradiance_kwh_m2=fallback_irradiance_kwh_m2,
            )
            if rows:
                return rows[: max(days * 8, days)]
        except Exception as exc:
            logger.warning(
                "OpenWeather forecast unavailable for %s: %s",
                sanitize_log_value(array_id),
                exc,
            )

    if provider in {"processed", "auto"}:
        rows = read_weather_csv(_weather_processed_path(), array_id=array_id)
        if rows:
            return rows[: max(days * 24, days)]

    return []
