# SolarGuard Technical Architecture

## Hardware Layer

SolarGuard combines the PI 2024000995 automated panel cleaning system with the UI 2023002890 solar-heat-water harvester. Sensors measure soiling, panel output, and local water availability. The cleaner executes scheduled or threshold-triggered cleaning cycles.

## Data Layer

Synthetic monthly degradation data lives in `data/processed/` and can be regenerated with `data/scripts/generate_dataset.py`. Raw irradiance and tariff inputs can be added under `data/raw/` as pilot data becomes available.

## Backend Layer

The FastAPI backend exposes:

- `POST /api/roi/calculate` for ROI and monthly recovery outputs.
- `GET /api/efficiency/{location}` for efficiency profiles.
- `GET /api/market/locations` for location assumptions.
- `GET /api/market/hormuz` for tariff-shock scenario metadata.

## Frontend Layer

The Vite React dashboard visualizes farm size, location, tariff, Hormuz scenario sensitivity, annual metrics, cumulative savings, water-loop synergy, and the monthly dataset table.

## Deployment

The frontend can deploy to Vercel as a static Vite build. The backend can deploy to Render or another ASGI host with `uvicorn main:app`.
