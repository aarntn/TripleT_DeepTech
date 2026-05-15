# SolarGuard Technical Architecture

## Hardware Layer

SolarGuard combines the PI 2024000995 automated panel cleaning system with the UI 2023002890 solar-heat-water harvester. Sensors measure soiling, panel output, and local water availability. The cleaner executes scheduled or threshold-triggered cleaning cycles.

## Data Layer

Synthetic monthly degradation data lives in `data/processed/` and can be
regenerated with `data/scripts/generate_dataset.py`. Synthetic sensor scenarios
are generated with `data/scripts/generate_sensor_data.py` and remain the
fallback for deterministic tests and offline demos.

Optional real weather data can be fetched with `data/scripts/fetch_weather_data.py`.
NASA POWER provides historical solar/weather rows, while OpenWeather provides
short-term forecast rows. Both are normalized into:

`timestamp,array_id,irradiance_kwh_m2,temp_c,humidity_pct,cloud_cover_pct,rainfall_mm,source`

NASA POWER hourly irradiance is converted from Wh/m2 to kWh/m2 during
normalization.

Generated real-weather outputs are intentionally ignored by git; keep approved
datasets or API credentials outside the public repository unless explicitly
reviewed.

## Backend Layer

The FastAPI backend exposes:

- `POST /api/roi/calculate` for ROI and monthly recovery outputs.
- `GET /api/efficiency/{location}` for efficiency profiles.
- `GET /api/market/locations` for location assumptions.
- `GET /api/market/hormuz` for tariff-shock scenario metadata.
- `GET /api/weather/forecast/{array_id}` for optional normalized weather forecast rows.

## Frontend Layer

The Vite React dashboard visualizes farm size, location, tariff, Hormuz scenario sensitivity, annual metrics, cumulative savings, water-loop synergy, and the monthly dataset table.

## Deployment

The frontend can deploy to Vercel as a static Vite build. The backend can deploy to Render or another ASGI host with `uvicorn main:app`.
