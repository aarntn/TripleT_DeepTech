# SolarGuard - Automated Solar O&M System

> **UM IP: PI 2024000995** (Automated Solar Panel Cleaning System) +
> **UM IP: UI 2023002890** (Solar-Heat-Water Harvester)
>
> Universiti Malaya - UMCIE Commercialisation Initiative - 2026

---

## What this is

SolarGuard is a combined hardware + software platform that maximises revenue from solar installations through two integrated UM-patented technologies:

1. **Auto Cleaner (TRL 8)** - AI-driven, sensor-triggered panel cleaning using a patented curved-flow fluid distribution system. Restores 15-30% of lost energy output. Reduces manual labour costs by 50-70%.
2. **Water Harvester (TRL 3)** - Pyramid-structured rainwater collector that supplies up to 72% of the cleaning system's water needs in Malaysia (avg 2,500mm/yr rainfall). Creates a closed-loop, off-grid capable O&M unit.

### Why now

Malaysia's LSS5+ programme opened bids for **4 GW** of new solar capacity in 2025. Budget 2026 added **LSS6** (2 GW, RM 6B private investment). Every new MW of installed capacity is a future O&M contract. Simultaneously, US/Israeli military operations against Iran (Feb 2026) and Hormuz disruption risk have raised energy price volatility - directly improving the ROI case for domestic solar output maximisation.

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
solarguard/
├── frontend/                  # Vite + React profit dashboard
│   └── src/
│       ├── components/        # Dashboard, charts, metric cards
│       ├── utils/             # ROI calculations, formatters
│       └── constants/         # Market data, location presets
│
├── backend/                   # Python FastAPI REST API
│   ├── api/routes/            # /roi, /efficiency, /market endpoints
│   ├── models/                # Pydantic request/response schemas
│   └── services/              # Degradation model, ROI calculator, carbon
│
├── data/
│   ├── raw/                   # Irradiance CSVs, tariff data
│   ├── processed/             # Monthly efficiency & ROI output CSVs
│   └── scripts/               # Dataset generator, processing pipeline
│
├── notebooks/                 # Jupyter EDA + model development
│   └── 01_degradation_analysis.ipynb
│
└── docs/
    ├── technical/             # Architecture, API reference
    └── commercial/            # Unit economics, market analysis
```

Additional docs are organized under `docs/ip/` for patent/reference PDFs and
`docs/prompts/` for prompt/spec artifacts. The backend also includes `core/`
security/error helpers and `scripts/` operational checks.

---

## Quick start

### Run locally (two terminals)

Start the backend first in Terminal A:

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
# Set a development API key for local auth (PowerShell / POSIX examples)
# Windows PowerShell: $env:SOLARGUARD_API_KEYS="dev-local-key"
# macOS/Linux: export SOLARGUARD_API_KEYS=dev-local-key
uvicorn main:app --reload
```

Then start the frontend in Terminal B:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# -> http://localhost:5173
```

Notes:
- The frontend expects the backend at `http://localhost:8000` by default; set `VITE_API_BASE_URL` in `frontend/.env` if different.
- Protected backend endpoints require a bearer token; for local development use `dev-local-key` unless you have configured a different key.
- For macOS/Linux shells, use `cp .env.example .env` in each folder if you prefer an `.env` file instead of exported variables.


### Generate dataset

```bash
cd data/scripts
python generate_dataset.py --location malaysia --mw 5 --output ../processed/
python generate_dataset.py --location gcc --mw 5 --output ../processed/
python generate_dataset.py --all --output ../processed/
```

### Optional real weather data

The checked-in synthetic datasets remain the default for deterministic tests and
offline demos. To add real weather context, fetch normalized NASA POWER history
or OpenWeather forecast rows into `data/processed/weather/`:

```bash
cd data/scripts
python fetch_weather_data.py --provider nasa-power --start 20240701 --end 20240707 --array-id A1
python fetch_weather_data.py --provider openweather --array-id A1 --api-key "$OPENWEATHER_API_KEY"
```

Set `WEATHER_PROVIDER=processed` to make the backend forecaster prefer the
generated weather CSV before falling back to `forecast_input.csv`. Set
`WEATHER_PROVIDER=openweather` with `OPENWEATHER_API_KEY` to call OpenWeather
live from the backend. Keep weather API keys backend-only.
NASA POWER hourly irradiance is normalized from Wh/m2 to kWh/m2 in the output.

The dashboard labels checked-in CSV sensor rows as demo data. Do not describe
those rows as real live telemetry unless a real ingestion source is added.

### Optional research notebooks

The notebook is for EDA/model-development traceability only. It is not required
to run the frontend, backend, tests, or deployment.

```bash
pip install jupyter
jupyter notebook notebooks/
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Recharts, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, Pydantic v2, Pandas |
| Data | NumPy, Pandas, Matplotlib, Seaborn |
| Notebooks | Jupyter, scikit-learn (degradation regression) |
| Deploy | Vercel (frontend) - Render (backend) |

---

## IP context

| Patent | Title | TRL | MR | Status |
|---|---|---|---|---|
| PI 2024000995 | System and Method for Cleaning a Solar Panel | 8 | 7 | Pilot-tested, commercial-ready |
| UI 2023002890 | Solar-Heat-Water Harvester | 3 | 3 | Lab-validated, field pilot pending |

Reference PDFs live in `docs/ip/`.

For licensing enquiries: **umcie@um.edu.my** - Tel: +603-79677351

---

## Environment variables

Copy `.env.example` to `.env` and fill in values before running the backend.

```env
CARBON_PRICE_RM=40
APP_ENV=development
SOLARGUARD_API_KEYS=dev-local-key
# SOLARGUARD_API_KEY_SHA256S=
CORS_ORIGINS=http://localhost:5173
TRUSTED_HOSTS=localhost,127.0.0.1
TRUSTED_PROXY_IPS=
MAX_REQUEST_BYTES=65536
RATE_LIMIT_PER_MINUTE=120
SENSITIVE_RATE_LIMIT_PER_MINUTE=20
ENABLE_API_DOCS=false
ENABLE_HSTS=false
MODEL_LOAD_MODE=train-fallback
# DUST_CLASSIFIER_SHA256=
# DUST_SCALER_SHA256=
API_HOST=127.0.0.1
API_PORT=8000
WEATHER_PROVIDER=synthetic
WEATHER_LAT=3.139
WEATHER_LON=101.6869
WEATHER_PROCESSED_PATH=data/processed/weather/forecast_weather.csv
# OPENWEATHER_API_KEY=
```

Frontend development variables live in `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SOLARGUARD_API_KEY=dev-local-key
VITE_USE_MOCKS=false
```

For production, set `APP_ENV=production`, use `SOLARGUARD_API_KEY_SHA256S`
instead of plaintext keys, keep `ENABLE_API_DOCS=false`, set exact
`CORS_ORIGINS` and `TRUSTED_HOSTS`, and run behind TLS plus an external
gateway or reverse-proxy rate limiter for multi-worker deployments. In-memory
rate limits are per process.

Model loading defaults to `MODEL_LOAD_MODE=train-fallback` only outside
production. Production requires `MODEL_LOAD_MODE=verified` plus
`DUST_CLASSIFIER_SHA256` and `DUST_SCALER_SHA256`. Generate approved hashes
from reviewed model artifacts with:

```powershell
Get-FileHash backend\models\dust_classifier.joblib -Algorithm SHA256
Get-FileHash backend\models\dust_scaler.joblib -Algorithm SHA256
```

Only deployment owners should update those hash values. If a model file and
its trusted hash can both be changed by the same attacker, hash verification no
longer proves provenance.

Optional authenticated load smoke test against a running backend:

```bash
python backend/scripts/load_smoke.py --api-key dev-local-key
```

---

## Contributing

This repository is part of a UMCIE commercialisation project. For collaboration or pilot partnership enquiries, contact the team via the issues tab.

---

Built with data grounded in: IEA Strait of Hormuz Report 2025, ISIS Malaysia Fuel Resilience Analysis Mar 2026, Malaysia Budget 2026 (Belanjawan 2026), Ember Solar Malaysia Report Aug 2024, SolarQuarter LSS pipeline data Feb 2025.
