# Solare – Automated Solar O&M Platform

> **UM IP: PI 2024000995** (Automated Solar Panel Cleaning System) +
> **UM IP: UI 2023002890** (Solar-Heat-Water Harvester)
>
> Universiti Malaya - UMCIE Commercialisation Initiative - 2026

---

## What this is

Solare is a combined hardware + software platform that maximises revenue from solar installations through two integrated UM-patented technologies:

1. **Auto Cleaner (TRL 8)** – AI-driven, sensor-triggered panel cleaning using a patented curved-flow fluid distribution system. Restores 15–30% of lost energy output. Reduces manual labour costs by 50–70%.
2. **Water Harvester (TRL 3)** – Pyramid-structured rainwater collector that supplies up to 72% of the cleaning system's water needs in Malaysia (avg 2,500mm/yr rainfall). Creates a closed-loop, off-grid capable O&M unit.

### Why now

Malaysia's LSS5+ programme opened bids for **4 GW** of new solar capacity in 2025. Budget 2026 added **LSS6** (2 GW, RM 6B private investment). Every new MW of installed capacity is a future O&M contract. Simultaneously, US/Israeli military operations against Iran (Feb 2026) and Hormuz disruption risk have raised energy price volatility — directly improving the ROI case for domestic solar output maximisation.

**Key numbers (5 MW Malaysia baseline):**

| Metric | Value |
|---|---|
| Annual revenue recovered | ~RM 316K |
| Payback period | ~2.5 years |
| 5-year NPV | ~RM 900K |
| Carbon credit value | ~RM 18K/yr |
| System cost | RM 600K (RM 120K/MW) |

---

## Repository structure

```text
solare/
├── frontend/                  # Vite + React dashboard (TypeScript)
│   └── src/
│       ├── components/        # Dashboard, charts, farm map, metric cards
│       ├── hooks/             # useSolarGuardData — API orchestration
│       ├── lib/               # Typed API client
│       └── utils/             # ROI calculations, formatters
│
├── backend/                   # Python FastAPI REST API
│   ├── api/routes/            # /sensor, /forecast, /weather, /roi, /market
│   ├── core/                  # Security middleware, error helpers
│   ├── models/                # Pydantic request/response schemas
│   └── services/              # Dust classifier, 3-day forecaster, ROI engine
│
├── data/
│   ├── raw/                   # Irradiance CSVs, tariff data
│   ├── processed/             # Scenario datasets (dusty week, rainy week)
│   └── scripts/               # Dataset generator, weather fetcher
│
├── notebooks/                 # Jupyter EDA + model development traceability
│
└── docs/
    ├── technical/             # Architecture, API reference
    ├── commercial/            # Unit economics, market analysis
    └── ip/                    # Patent reference PDFs
```

---

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1 — Backend (Terminal A)

```bash
cd backend
python -m venv venv

# Activate:
# Windows:      .\venv\Scripts\activate
# macOS/Linux:  source venv/bin/activate

pip install -r requirements.txt
```

Copy the root `.env.example` to `.env` and set your dev API key:

```bash
# From the repo root:
cp .env.example .env
# .env already contains SOLARGUARD_API_KEYS=dev-local-key — no changes needed for local dev
```

Start the server:

```bash
uvicorn main:app --reload
# Runs on http://127.0.0.1:8000
```

### 2 — Frontend (Terminal B)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# -> http://localhost:5173
```

The frontend `.env.example` already points to `http://127.0.0.1:8000` with `dev-local-key` — no changes needed for local dev.

---

## ML models

The backend runs two scikit-learn models trained at startup from `data/processed/scenario_dusty_week.csv`:

| Model | Purpose | Algorithm |
|---|---|---|
| Dust classifier | Classifies each array as Dust / Weather / Normal | RandomForest |
| Efficiency forecaster | 3-day revenue + efficiency forecast per array | LinearRegression |

`MODEL_LOAD_MODE=train-fallback` (default) trains in memory if no saved `.joblib` files are found. Production deployments should use `MODEL_LOAD_MODE=verified` with SHA256 hashes.

---

## Optional: real weather data

The checked-in synthetic datasets are the default for deterministic demos and offline use. To add real weather context:

```bash
cd data/scripts

# Fetch NASA POWER historical irradiance
python fetch_weather_data.py --provider nasa-power --start 20240701 --end 20240707 --array-id A1

# Or fetch OpenWeather live forecast
python fetch_weather_data.py --provider openweather --array-id A1 --api-key "$OPENWEATHER_API_KEY"
```

Set `WEATHER_PROVIDER=openweather` in `.env` with `OPENWEATHER_API_KEY` to call OpenWeather live. Keep weather API keys backend-only.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Recharts, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, Pydantic v2, Pandas |
| ML | scikit-learn (RandomForest, LinearRegression), joblib |
| Data | NumPy, Pandas, Matplotlib, Seaborn |
| Notebooks | Jupyter |
| Deploy | Vercel (frontend) · Render (backend) |

---

## IP context

| Patent | Title | TRL | MR | Status |
|---|---|---|---|---|
| PI 2024000995 | System and Method for Cleaning a Solar Panel | 8 | 7 | Pilot-tested, commercial-ready |
| UI 2023002890 | Solar-Heat-Water Harvester | 3 | 3 | Lab-validated, field pilot pending |

Reference PDFs in `docs/ip/`. Licensing enquiries: **umcie@um.edu.my** · +603-79677351

---

## Environment variables

Backend (root `.env`):

```env
CARBON_PRICE_RM=40
APP_ENV=development
SOLARGUARD_API_KEYS=dev-local-key
CORS_ORIGINS=http://localhost:5173
TRUSTED_HOSTS=localhost,127.0.0.1
RATE_LIMIT_PER_MINUTE=120
SENSITIVE_RATE_LIMIT_PER_MINUTE=120
MODEL_LOAD_MODE=train-fallback
API_HOST=127.0.0.1
API_PORT=8000
WEATHER_PROVIDER=synthetic
WEATHER_LAT=3.139
WEATHER_LON=101.6869
```

Frontend (`frontend/.env`):

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SOLARGUARD_API_KEY=dev-local-key
VITE_USE_MOCKS=false
```

For production: set `APP_ENV=production`, switch to `SOLARGUARD_API_KEY_SHA256S` (hashed keys), set exact `CORS_ORIGINS` and `TRUSTED_HOSTS`, enable TLS, and use `MODEL_LOAD_MODE=verified` with `DUST_CLASSIFIER_SHA256` / `DUST_SCALER_SHA256`.

---

## Contributing

This repository is part of a UMCIE commercialisation project. For collaboration or pilot partnership enquiries, open an issue or contact the team.

---

Built with data grounded in: IEA Strait of Hormuz Report 2025, ISIS Malaysia Fuel Resilience Analysis Mar 2026, Malaysia Budget 2026 (Belanjawan 2026), Ember Solar Malaysia Report Aug 2024, SolarQuarter LSS pipeline data Feb 2025.
