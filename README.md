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

---

## Quick start

### Frontend

```bash
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

### Backend

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
# -> http://localhost:8000
# -> Swagger docs at /docs
```

### Generate dataset

```bash
cd data/scripts
python generate_dataset.py --location malaysia --mw 5 --output ../processed/
python generate_dataset.py --location gcc --mw 5 --output ../processed/
python generate_dataset.py --all --output ../processed/
```

### Notebooks

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

For licensing enquiries: **umcie@um.edu.my** - Tel: +603-79677351

---

## Environment variables

Copy `.env.example` to `.env` and fill in values before running the backend.

```env
CARBON_PRICE_RM=40
DEFAULT_TARIFF_MY=0.35
DEFAULT_TARIFF_GCC=0.42
API_HOST=0.0.0.0
API_PORT=8000
```

---

## Contributing

This repository is part of a UMCIE commercialisation project. For collaboration or pilot partnership enquiries, contact the team via the issues tab.

---

Built with data grounded in: IEA Strait of Hormuz Report 2025, ISIS Malaysia Fuel Resilience Analysis Mar 2026, Malaysia Budget 2026 (Belanjawan 2026), Ember Solar Malaysia Report Aug 2024, SolarQuarter LSS pipeline data Feb 2025.
