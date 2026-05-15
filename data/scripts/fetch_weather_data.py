"""
Fetch real weather data and normalize it for SolarGuard.

Examples:
    python fetch_weather_data.py --provider nasa-power --start 20240701 --end 20240707
    python fetch_weather_data.py --provider openweather --array-id A1
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from services.weather_provider import (  # noqa: E402
    fetch_nasa_power_history,
    fetch_openweather_forecast,
    write_weather_csv,
)


def _default_start_end() -> tuple[str, str]:
    end = datetime.now(timezone.utc).date() - timedelta(days=1)
    start = end - timedelta(days=6)
    return start.strftime("%Y%m%d"), end.strftime("%Y%m%d")


def _write_raw(payload: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> int:
    default_start, default_end = _default_start_end()
    parser = argparse.ArgumentParser(description="Fetch normalized SolarGuard weather data.")
    parser.add_argument("--provider", choices=["nasa-power", "openweather"], required=True)
    parser.add_argument("--lat", type=float, default=float(os.getenv("WEATHER_LAT", "3.139")))
    parser.add_argument("--lon", type=float, default=float(os.getenv("WEATHER_LON", "101.6869")))
    parser.add_argument("--array-id", default="A1")
    parser.add_argument("--start", default=default_start, help="NASA POWER start date, YYYYMMDD")
    parser.add_argument("--end", default=default_end, help="NASA POWER end date, YYYYMMDD")
    parser.add_argument("--api-key", default=os.getenv("OPENWEATHER_API_KEY", ""))
    parser.add_argument(
        "--output",
        type=Path,
        default=REPO_ROOT / "data" / "processed" / "weather" / "forecast_weather.csv",
    )
    parser.add_argument("--raw-output", type=Path)
    args = parser.parse_args()

    if args.provider == "nasa-power":
        rows = fetch_nasa_power_history(
            lat=args.lat,
            lon=args.lon,
            start=args.start,
            end=args.end,
            array_id=args.array_id,
        )
    else:
        if not args.api_key:
            parser.error("--api-key or OPENWEATHER_API_KEY is required for OpenWeather")
        rows = fetch_openweather_forecast(
            lat=args.lat,
            lon=args.lon,
            api_key=args.api_key,
            array_id=args.array_id,
        )

    write_weather_csv(rows, args.output)
    if args.raw_output:
        _write_raw(rows, args.raw_output)

    print(f"Wrote {len(rows)} normalized rows -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
