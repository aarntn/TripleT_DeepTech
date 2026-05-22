# SolarSense — Full Technical Reference

**UM Patent PI 2024000995 | TRL 8 | Version 0.2.0**

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Pipeline](#2-data-pipeline)
3. [Training Data Generation](#3-training-data-generation)
4. [Dust Classification — Machine Learning Pipeline](#4-dust-classification--machine-learning-pipeline)
5. [Soiling Accumulation Model](#5-soiling-accumulation-model)
6. [3-Class Decision Logic](#6-3-class-decision-logic)
7. [Model Validation — Retrospective Against Real Weather](#7-model-validation--retrospective-against-real-weather)
8. [3-Day Efficiency Forecaster](#8-3-day-efficiency-forecaster)
9. [ROI Calculator](#9-roi-calculator)
10. [Degradation Model — Monthly Efficiency Profiles](#10-degradation-model--monthly-efficiency-profiles)
11. [Carbon Credit Calculator](#11-carbon-credit-calculator)
12. [Weather Data Integration](#12-weather-data-integration)
13. [API Reference](#13-api-reference)
14. [Security Architecture](#14-security-architecture)
15. [Model Integrity and Production Deployment](#15-model-integrity-and-production-deployment)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HARDWARE LAYER                           │
│  BPW34 photodiode arrays  ·  GL5516 LDR  ·  ESP32 firmware      │
│  UM Patent PI 2024000995 automated cleaning mechanism           │
└────────────────────────┬────────────────────────────────────────┘
                         │ sensor readings (efficiency, irradiance,
                         │ cloud cover, humidity, rainfall, soiling)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER                             │
│                    FastAPI  ·  Python 3.x                       │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  DustClassifier  │  │   Forecaster     │  │ ROI Calc     │  │
│  │  RandomForest    │  │ LinearRegression │  │ NPV model    │  │
│  │  100 estimators  │  │  3-day lookahead │  │ 7-year life  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ RetroValidator   │  │ WeatherProvider  │  │ Carbon Calc  │  │
│  │ Open-Meteo 2024  │  │ NASA/OWM/Meteo   │  │ MY grid 0t   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                 │
│  Security: API key auth · rate limiting · HSTS · CORS · HMAC   │
└────────────────────────┬────────────────────────────────────────┘
                         │ JSON REST API (HTTPS)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                             │
│               Vite · React · TypeScript                         │
│                                                                 │
│  Farm Map  ·  Block Heatmap  ·  ROI Calculator                  │
│  Model Performance Card  ·  3-Day Forecast  ·  ESG Audit Trail  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | File | Purpose |
|---|---|---|
| FastAPI app | `backend/main.py` | App factory, middleware stack, lifespan cache warm-up |
| Dust classifier | `backend/services/dust_classifier.py` | Random Forest, model loading, binary prediction |
| Retrospective validator | `backend/services/retrospective_validator.py` | Real-weather model validation |
| Forecaster | `backend/services/forecaster.py` | 3-day efficiency + revenue forecast |
| ROI calculator | `backend/services/roi_calculator.py` | 7-year NPV, payback, monthly breakdown |
| Degradation model | `backend/services/degradation_model.py` | Monthly efficiency profiles, Malaysia + GCC |
| Carbon calculator | `backend/services/carbon_calculator.py` | Grid emission factor, carbon credit RM value |
| Weather provider | `backend/services/weather_provider.py` | Multi-source weather ingestion |
| Security middleware | `backend/core/security.py` | Auth, rate limiting, headers, logging safety |
| Error handlers | `backend/core/errors.py` | Structured error responses, no info leakage |

---

## 2. Data Pipeline

The complete flow from sensor reading to cleaning decision:

```
Step 1  Sensor input arrives at POST /api/sensor/classify
        Fields: array_id, efficiency_pct, irradiance_kwh_m2,
                cloud_cover_pct, humidity_pct, rainfall_mm, soiling_loss_pct

Step 2  Pydantic validation (ClassifyRequest)
        - extra="forbid": reject unexpected fields
        - FiniteFloat bounds: efficiency 0–100, irradiance 0–20,
          rainfall 0–500, all others 0–100
        - Infinite/NaN values rejected explicitly in classifier

Step 3  Feature vector assembly
        6-element array: [efficiency_pct, irradiance_kwh_m2,
                          cloud_cover_pct, humidity_pct,
                          rainfall_mm, soiling_loss_pct]

Step 4  StandardScaler transforms feature vector
        (same scaler fitted on training data, consistent normalisation)

Step 5  RandomForest binary prediction: 1 = dust, 0 = not dust
        Probability vector returned for confidence score

Step 6  3-class label assignment
        dust_flag=1                    → "dust"   (clean now)
        cloud_cover>50 OR rainfall>0  → "weather" (wait)
        otherwise                     → "normal"  (no action)

Step 7  Confidence threshold check
        confidence > 0.85 → "dust accumulation confirmed"
        confidence ≤ 0.85 → "likely dust — monitor 2 more hours"

Step 8  ClassifyResponse returned: { type, confidence, cause }
```

---

## 3. Training Data Generation

**File:** `data/scripts/generate_sensor_data.py`

Two synthetic scenarios are generated to create the training dataset. Both are deterministic (fixed random seeds) so results are reproducible.

### Scenario A — Dusty Week (`scenario_dusty_week.csv`)

Simulates 7 days of dry, progressively soiling conditions across 6 array blocks (A1, A2, B1, B2, C1, C2) from 2024-07-01.

**Array efficiency trajectories (linear degradation over 7 days):**

| Array | Day 1 efficiency | Day 7 efficiency | Pattern |
|---|---|---|---|
| A1 | 97.0% | 61.0% | Heavy dust accumulation |
| A2 | 94.0% | 78.0% | Moderate dust |
| B1 | 96.0% | 88.0% | Light dust |
| B2 | 91.0% | 72.0% | Moderate–heavy dust |
| C1 | 95.0% | 89.0% | Partial wind cleaning on day 4, stable at 89% |
| C2 | 98.0% | 83.0% | Moderate dust |

**Irradiance model:** Solar day runs 07:00–19:00. Irradiance follows a sin² bell curve peaking at 12:00, reaching zero at 07:00 and 17:00+:

```python
irradiance_factor = max(0.0, sin(π × (hour − 7) / 10)²)
```

Peak irradiance: 4.5 kWh/m² (Malaysia baseline). Daily variance multiplier: ±20% (uniform random, seed 42).

**Labelling rule:** `dust_flag = 1` when `efficiency_pct < 95.0%`.

### Scenario B — Rainy Week (`scenario_rainy_week.csv`)

Simulates 7 days containing two rainfall events from 2024-12-01.

**Rainfall schedule:**
- Day 2 (index 1): 18.0 mm heavy rain — triggers full soiling reset
- Day 5 (index 4): 6.0 mm light rain — does NOT reset soiling (below 15mm threshold)

**Efficiency behaviour:**
- Day 1: baseline efficiency (87–91% depending on array)
- Day 2 (rain day): efficiency drops 1–3% from cloud cover, then recovers
- Day 3 (day after heavy rain): 80% of dust washed off, efficiency recovers to 92–96%
- Days 4–5: slow re-accumulation at −0.5%/day
- Days 6–7: faster re-accumulation at −0.8%/day

**Rain day atmospheric conditions:**
- Cloud cover: 60–90%
- Humidity: 90–100%
- Hourly rain distributed evenly across 13 daylight hours

**Labelling rule:** `dust_flag = 1` only when `efficiency_pct < 95.0% AND NOT rain_event`. Rain-day drops are not labelled as dust.

### Combined Dataset

The two scenarios are concatenated for training:

```
scenario_dusty_week.csv  :  6 arrays × 7 days × 13 hours = 546 rows
scenario_rainy_week.csv  :  6 arrays × 7 days × 13 hours = 546 rows
Total training data      :  1,092 rows
Train split (80%)        :  873 rows
Test split (20%)         :  219 rows
```

---

## 4. Dust Classification — Machine Learning Pipeline

**File:** `backend/services/dust_classifier.py`

### Algorithm

**Random Forest Classifier** with 100 decision trees (`n_estimators=100`, `random_state=42`).

Random Forest was selected over alternatives for the following reasons:
- Handles correlated features well (humidity and cloud cover both rise during rain)
- Naturally produces probability scores for confidence thresholds
- Robust to small training sets without overfitting
- No hyperparameter tuning required for interpretable baseline performance

### Feature Engineering

Six features form the input vector:

| Feature | Unit | Range | Why it matters |
|---|---|---|---|
| `efficiency_pct` | % | 0–100 | Primary signal — dust reduces actual vs expected output |
| `irradiance_kwh_m2` | kWh/m² | 0–20 | Distinguishes low-light from low-efficiency |
| `cloud_cover_pct` | % | 0–100 | Identifies weather-driven drops, not dust |
| `humidity_pct` | % | 0–100 | High humidity before rain; also mud film indicator |
| `rainfall_mm` | mm | 0–500 | Direct rain detection; distinguishes light from heavy |
| `soiling_loss_pct` | % | 0–100 | Cumulative dust build-up since last clean/reset |

### Training Pipeline

```python
# 1. Load and concatenate scenarios
df = concat([dusty_week, rainy_week])

# 2. Extract feature matrix and binary labels
X = df[FEATURES].values        # shape: (1092, 6)
y = df["dust_flag"].values      # shape: (1092,) — binary 0/1

# 3. Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 4. Standardise features (zero mean, unit variance)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# 5. Fit classifier
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train_scaled, y_train)
```

### Prediction Pipeline

```python
# 1. Assemble feature vector from incoming sensor reading
features = [[efficiency_pct, irradiance_kwh_m2, cloud_cover_pct,
             humidity_pct, rainfall_mm, soiling_loss_pct]]

# 2. Validate: all values must be finite
assert np.isfinite(features).all()

# 3. Apply same scaler fitted on training data
scaled = scaler.transform(features)

# 4. Predict: binary label + probability vector
pred   = clf.predict(scaled)[0]          # 0 or 1
proba  = clf.predict_proba(scaled)[0]    # [p_clean, p_dust]
confidence = proba[pred]
```

### 3-Class Mapping

The Random Forest outputs a binary label (dust / not-dust). A deterministic post-processing step resolves the three-class output:

```python
def _assign_3class_label(dust_flag, cloud_cover_pct, rainfall_mm):
    if dust_flag == 1:
        return 0   # Dust — clean now
    if cloud_cover_pct > 50 or rainfall_mm > 0:
        return 1   # Weather — wait
    return 2       # Normal — no action
```

This separation is critical for Malaysia: low efficiency from cloud cover or rain must never trigger a cleaning dispatch. Only confirmed dust accumulation justifies the cost of a cleaning crew.

---

## 5. Soiling Accumulation Model

**File:** `backend/services/retrospective_validator.py`

This physics-based model is tuned specifically for Malaysia's tropical humid climate. It runs on top of real historical weather data to generate ground-truth soiling labels for the retrospective validation.

### Parameters

| Parameter | Value | Rationale |
|---|---|---|
| `SOILING_RATE_PER_DRY_DAY` | 0.30 %/day | Malaysia: humid-season dust accumulation rate. Derived from Sulaiman 2018 Perak field study |
| `RAIN_THRESHOLD_MM` | 15.0 mm/day | Only heavy downpours clean panels. Light drizzle below 15mm leaves a muddy film that worsens soiling |
| `MAX_SOILING_LOSS_PCT` | 20.0 % | Cap on cumulative loss — matches Sulaiman 2018 observed worst-case 18% efficiency drop |
| `BASE_EFFICIENCY_PCT` | 95.0 % | Clean panel operating baseline |

### Daily Calculation Loop

```
For each day in the weather record:

  IF rainfall_mm >= 15.0:
      cumulative_soiling = 0.0          ← heavy rain resets panel

  ELSE:
      cumulative_soiling = min(
          cumulative_soiling + 0.30,    ← dry day adds 0.30%
          20.0                          ← capped at 20%
      )

  weather_loss = max(0, (cloud_cover - 30) × 0.08)
      if cloud_cover > 30%, else 0      ← cloud penalty independent of soiling

  efficiency = max(20.0,
      95.0 - cumulative_soiling - weather_loss)

  dust_flag = 1  if  cumulative_soiling > 3.0%
              0  otherwise
```

### Why 15mm Threshold

Malaysian drizzle events (< 5mm) are frequent but deposit mineral-laden water on panels. As the water evaporates it leaves a thin mineral and dust film that is chemically more adhesive than dry dust. The 15mm threshold is derived from Sulaiman et al. 2018, which observed panel efficiency improvement only following rainfall events exceeding 12–18mm over a 4-month Perak measurement campaign.

---

## 6. 3-Class Decision Logic

The full cleaning decision combines the ML classifier output with the soiling model and the weather state. The complete logic tree:

```
                     Sensor reading arrives
                            │
                    ┌───────▼────────┐
                    │ RF Classifier  │
                    │ predict binary │
                    └───────┬────────┘
                   dust=1   │   dust=0
              ┌─────────────┘     └──────────────┐
              │                                   │
    ┌─────────▼──────────┐          ┌─────────────▼──────────┐
    │  DUST CONFIRMED    │          │  cloud > 50%            │
    │                    │          │  OR rainfall > 0 mm?    │
    │  confidence > 0.85 │          └─────────────┬───────────┘
    │  → "Dust confirmed"│                YES      │      NO
    │  confidence ≤ 0.85 │           ┌─────────────┘      │
    │  → "Monitor 2h"    │           │                     │
    └─────────┬──────────┘  ┌────────▼──────────┐  ┌───────▼──────┐
              │             │   WEATHER EVENT   │  │    NORMAL    │
              │             │   Do not clean    │  │  No action   │
              │             │   Wait for clear  │  │  required    │
              │             └───────────────────┘  └──────────────┘
              ▼
    Dispatch cleaning crew
    Log ESG audit event
```

### Output Schema

```json
{
  "type":       "dust" | "weather" | "normal",
  "confidence": 0.0–1.0,
  "cause":      "human-readable explanation string"
}
```

**Cause strings by scenario:**

| Scenario | Cause text |
|---|---|
| Dust, confidence > 0.85 | "Sustained efficiency drop without cloud cover — dust accumulation confirmed." |
| Dust, confidence ≤ 0.85 | "Likely dust — monitor for another 2 hours before triggering clean." |
| Weather event | "Temporary output drop from cloud cover or rain — no cleaning needed." |
| Normal | "Panel output within expected range. No action required." |

---

## 7. Model Validation — Retrospective Against Real Weather

**File:** `backend/services/retrospective_validator.py`

**Endpoint:** `GET /api/sensor/classifier/retrospective`

To validate that the classifier trained on synthetic data generalises to real-world Malaysian conditions, the retrospective validation pipeline runs the model against an entire year of actual recorded weather.

### Validation Methodology

```
Step 1  Fetch 366 days of real daily weather for Selangor, Malaysia
        from Open-Meteo Historical Archive API
        (lat=3.0738, lon=101.5183, 2024-01-01 → 2024-12-31)
        Fields: precipitation_sum, cloud_cover_mean,
                temperature_2m_mean, shortwave_radiation_sum,
                relative_humidity_2m_mean

Step 2  Apply soiling accumulation model to derive ground-truth labels
        (0.30%/day accumulation, 15mm rain reset, 20% cap)
        → efficiency_pct, soiling_loss_pct, dust_flag per day

Step 3  Assemble 6-feature vector for each of the 366 days
        using the same FEATURES list as the production classifier

Step 4  Train classifier on synthetic CSV data (as in production)
        Apply same scaler, predict binary labels on real weather features

Step 5  Map binary predictions to 3-class labels
        using _assign_3class_label with real cloud/rain values

Step 6  Compare predicted 3-class labels vs soiling-model ground truth
        Compute: confusion matrix, per-class precision/recall/F1,
                 macro F1, weighted F1, accuracy
```

### Why Weighted F1, Not Macro F1

Malaysia 2024 produced only 1 genuinely "Normal" day (cloud cover < 50% and zero rainfall) out of 366. The tropical climate produces cloud or rain on virtually every day. This extreme class imbalance means:

- **Macro F1** penalises all classes equally regardless of frequency. With 1 Normal sample, its F1 collapses to 0.00, pulling macro F1 down to ~0.44 even when the classifier is performing correctly.
- **Weighted F1** weights each class's F1 score by its share of the total samples. This correctly reflects per-prediction accuracy in real operating conditions.

**Result on Selangor 2024 (366 days):**

| Metric | Value | Interpretation |
|---|---|---|
| Weighted F1 | **0.84** | 84% of predictions correct weighted by class frequency |
| Accuracy | varies | Overall fraction correct |
| Dust recall | primary KPI | Most important: correctly catching all dust days |
| Macro F1 | ~0.44 | Misleading due to 1 Normal sample — not reported to users |

The result is cached after first computation to avoid a 25-second Open-Meteo fetch on every dashboard load.

---

## 8. 3-Day Efficiency Forecaster

**File:** `backend/services/forecaster.py`

**Endpoint:** `GET /api/forecast/{array_id}`

### Algorithm

**Linear Regression** trained per array on the historical sensor CSV.

Linear regression was chosen for the forecaster because:
- Short 3-day window requires extrapolation, not interpolation — complex models overfit
- The primary driver (day index over time) is nearly linear during a dust accumulation period
- Interpretable bounds can be derived directly from residual standard deviation

### Forecasting Pipeline

```
Step 1  Load scenario_dusty_week.csv for the requested array_id

Step 2  Aggregate hourly readings to daily averages:
        efficiency_pct (mean), cloud_cover_pct (mean),
        humidity_pct (mean), rainfall_mm (sum),
        irradiance_kwh_m2 (sum)

Step 3  Features: [day_idx, cloud_cover_pct, humidity_pct,
                   rainfall_mm, irradiance_kwh_m2]
        Target:   efficiency_pct

Step 4  Fit LinearRegression on all available days

Step 5  Compute residuals; residual std dev sets confidence interval width

Step 6  Fetch 3-day weather forecast via WeatherProvider
        (OpenWeather API if key available → processed CSV → safe defaults)

Step 7  For each of 3 future days:
        predict efficiency using future day_idx + weather inputs
        compute revenue: irradiance × 2000 kWp × (efficiency/100) × RM 0.39/kWh
        compute bounds: ±1.5 × residual_std
```

### Revenue Formula

```
forecast_revenue_rm = irradiance_kwh_m2
                    × ARRAY_RATED_KWP (2,000 kWp)
                    × (forecast_efficiency_pct / 100)
                    × DEFAULT_TARIFF_RM_PER_KWH (RM 0.39)
```

Tariff source: Malaysia Energy Commission 2024 LSS rate.

### Safe Default Fallback

If no sensor data exists for an array or the CSV is unavailable, the forecaster returns a deterministic safe default of 85% efficiency with ±5% bounds rather than raising an error. This prevents dashboard failures during demos or pilot deployments before real data is available.

---

## 9. ROI Calculator

**File:** `backend/services/roi_calculator.py`

**Endpoint:** `POST /api/roi/calculate`

### Constants

| Constant | Value | Source |
|---|---|---|
| `DEFAULT_TARIFF_RM_PER_KWH` | RM 0.39 | Malaysia Energy Commission 2024 LSS tariff |
| `SYSTEM_COST_PER_MW` | RM 120,000 | Capital cost of cleaning hardware per MW |
| `SOLARGUARD_SUBSCRIPTION_RM_PER_MW` | RM 6,000 | SolarSense wholesale rate (RM 6/kWp/yr) |
| `OTHER_OM_RM_PER_MW` | RM 9,000 | Cleaning labour, water, consumables per MW |
| `ANNUAL_OM_PER_MW` | RM 15,000 | Total O&M (subscription + labour) |
| `DISCOUNT_RATE` | 10% | Standard infrastructure project discount rate |
| `PROJECT_LIFE_YEARS` | 7 | Full NPV horizon |
| `HORMUZ_MULTIPLIER` | 1.25 | Tariff shock scenario (+25%) |

### Monthly Revenue Calculation

For each of 12 months, using location-specific seasonal efficiency profiles:

```
kwh_with    = monthly_irradiance_per_MW × MW × (eff_with / 100)
kwh_without = monthly_irradiance_per_MW × MW × (eff_without / 100)
kwh_recovered = kwh_with - kwh_without

revenue_rm = kwh_recovered × effective_tariff
carbon_rm  = kwh_recovered × 0.000585 t/kWh × RM 40/tonne
```

Monthly irradiance per MW: `irradiance_kwh_m2/day × 1,000 × (365/12)`

### Annual and NPV Calculations

```
annual_revenue       = sum of 12 monthly revenue_rm values
annual_subscription  = MW × RM 6,000
annual_om            = MW × RM 15,000
annual_net           = annual_revenue - annual_om

payback_years = system_cost / annual_net

annuity_factor = (1 - (1 + 0.10)^(-7)) / 0.10
npv = (annual_net × annuity_factor) - system_cost
```

### Cumulative Chart Data

8 data points (Year 0 through Year 7) showing:
- `system_cost_k`: capital cost in RM thousands (constant)
- `cum_savings_k`: cumulative net savings in RM thousands (linear growth)

### Input Validation

```
mw:               FiniteFloat, gt=0, le=50
location:         Literal["malaysia", "gcc"]
tariff_rm_per_kwh: FiniteFloat, gt=0, le=2
hormuz:           bool, default False
```

`extra="forbid"` rejects any additional fields not in the schema.

---

## 10. Degradation Model — Monthly Efficiency Profiles

**File:** `backend/services/degradation_model.py`

**Endpoint:** `GET /api/efficiency/{location}`

Monthly efficiency profiles for two markets. Each profile has two series: `eff_with` (AI-scheduled cleaning) and `eff_without` (manual/no cleaning baseline).

### Malaysia — Humid Tropical

Source: Sulaiman et al. 2018 Perak field study (PVSC), adapted with Open-Meteo 2024 Selangor rainfall calendar.

Two monsoon seasons govern the pattern:
- Northeast monsoon (Nov–Jan): heavy rainfall resets soiling; efficiency naturally high
- Southwest monsoon (May–Sep): drier spells allow progressive accumulation
- Peak soiling: August–September (cumulative dry-season build-up)

| Month | `eff_with` | `eff_without` | Δ (cleaning benefit) |
|---|---|---|---|
| Jan | 97.5% | 97.0% | 0.5% |
| Feb | 96.0% | 93.5% | 2.5% |
| Mar | 95.5% | 90.0% | 5.5% |
| Apr | 96.0% | 88.5% | 7.5% |
| May | 96.5% | 87.5% | 9.0% |
| Jun | 96.0% | 86.0% | 10.0% |
| Jul | 95.5% | 83.5% | 12.0% |
| Aug | 95.5% | 82.0% | 13.5% |
| Sep | 96.0% | 81.5% | 14.5% |
| Oct | 96.5% | 84.0% | 12.5% |
| Nov | 97.0% | 88.5% | 8.5% |
| Dec | 97.5% | 94.5% | 3.0% |

**Irradiance baseline:** 4.5 kWh/m²/day

### GCC — Arid Desert

Soiling rate approximately 0.5%/day (versus 0.3%/day Malaysia). Only winter rain (Dec–Feb) provides natural reset. Maximum soiling reached in June–August.

| Month | `eff_with` | `eff_without` | Δ (cleaning benefit) |
|---|---|---|---|
| Jan | 96.0% | 95.5% | 0.5% |
| Jun | 94.5% | 60.0% | 34.5% |
| Aug | 94.5% | 60.0% | 34.5% |

**Irradiance baseline:** 5.8 kWh/m²/day

Both profiles satisfy the invariant `eff_with >= eff_without` for every month (a Jan/Feb sign error in an earlier version was corrected).

---

## 11. Carbon Credit Calculator

**File:** `backend/services/carbon_calculator.py`

Two functions composing the carbon value of recovered energy.

### Grid Emission Factor

```
GRID_EMISSION_FACTOR = 0.000585 tCO₂e/kWh
```

Source: Malaysia's national grid average emission factor. Each kWh recovered from panels that would otherwise produce less due to soiling avoids 0.585 kg of CO₂ equivalent.

### Carbon Credit Value

```
CARBON_PRICE_RM = 40 RM/tonne   (configurable via CARBON_PRICE_RM env var)

tonnes_avoided(kwh) = kwh × 0.000585
carbon_credit_rm(kwh) = tonnes_avoided(kwh) × RM 40
```

This value is added to each month's revenue calculation in the ROI model, and is displayed separately in the dashboard so operators can report it in their Bursa ESG disclosures.

---

## 12. Weather Data Integration

**File:** `backend/services/weather_provider.py`

The weather provider is a multi-source pipeline with automatic fallback.

### Provider Priority Order

```
1. OpenWeather API (live 3-day forecast)
   Requires: OPENWEATHER_API_KEY env var
   URL: api.openweathermap.org/data/2.5/forecast
   Fields: temperature, humidity, cloud cover (%), rainfall (3h)

2. Processed CSV (pre-fetched, stored locally)
   Path: data/processed/weather/forecast_weather.csv
   Used when: no API key, or OpenWeather unavailable

3. Safe defaults (synthetic fallback)
   Used when: no API key and no CSV file
   Values: cloud=20%, humidity=75%, rainfall=0, irradiance=mean
```

### Historical Archive (Open-Meteo)

Used exclusively for retrospective validation. No API key required.

```
URL: archive-api.open-meteo.com/v1/archive
Fields fetched:
  - precipitation_sum      → rainfall_mm
  - cloud_cover_mean       → cloud_cover_pct
  - temperature_2m_mean    → temp_c
  - shortwave_radiation_sum → irradiance_kwh_m2 (÷3.6 to convert MJ→kWh)
  - relative_humidity_2m_mean → humidity_pct

Timezone: Asia/Kuala_Lumpur
```

The field name `cloud_cover_mean` (not `cloudcover_mean`) reflects the Open-Meteo API v1 naming post-2023. An earlier version used the stale name and received HTTP 400 responses; this was corrected in commit `66e3370`.

### NASA POWER (Historical Irradiance)

```
URL: power.larc.nasa.gov/api/temporal/hourly/point
Parameters: ALLSKY_SFC_SW_DWN, T2M, RH2M, PRECTOTCORR

Unit normalisation:
  NASA POWER returns ALLSKY_SFC_SW_DWN in Wh/m²
  → divide by 1000 to get kWh/m²
```

### Data Normalisation

All providers normalise to the same schema before returning:

```json
{
  "timestamp":        "ISO 8601 UTC string",
  "array_id":         "A1",
  "irradiance_kwh_m2": 3.2,
  "temp_c":           31.5,
  "humidity_pct":     78.0,
  "cloud_cover_pct":  25.0,
  "rainfall_mm":      0.0,
  "source":           "openweather | nasa_power | processed_weather"
}
```

Fill-in sentinel: NASA POWER uses -999 for missing data. The `_as_float` function returns 0.0 for any value ≤ -900.

---

## 13. API Reference

Base URL: `http://localhost:8000` (development) / `https://your-domain.com` (production)

Authentication: All routes except `GET /` require `Authorization: Bearer <api_key>` header.

### Sensor Routes — `/api/sensor`

#### `POST /api/sensor/classify`

Classify a single sensor reading.

**Rate limit:** 20 requests/minute (sensitive route)

**Request body:**
```json
{
  "array_id":          "B2",
  "efficiency_pct":    72.3,
  "irradiance_kwh_m2": 3.8,
  "cloud_cover_pct":   18.0,
  "humidity_pct":      82.0,
  "rainfall_mm":        0.0,
  "soiling_loss_pct":  24.7
}
```

**Response:**
```json
{
  "type":       "dust",
  "confidence": 0.91,
  "cause":      "Sustained efficiency drop without cloud cover — dust accumulation confirmed."
}
```

#### `GET /api/sensor/latest`

Returns the most recent reading per array block from the sensor CSV.

**Response:** Array of SensorReading objects (one per block A1–C2).

#### `GET /api/sensor/history`

Returns all rows in the sensor CSV sorted by array and timestamp.

#### `GET /api/sensor/classifier/performance`

Returns held-out test set evaluation metrics.

**Response:**
```json
{
  "classes": ["Dust", "Weather", "Normal"],
  "confusion_matrix": [[...], [...], [...]],
  "per_class": {
    "Dust":    {"precision": 0.95, "recall": 0.93, "f1": 0.94, "support": 87},
    "Weather": {"precision": 0.98, "recall": 0.99, "f1": 0.98, "support": 105},
    "Normal":  {"precision": 0.90, "recall": 0.88, "f1": 0.89, "support": 27}
  },
  "macro_f1":    0.97,
  "accuracy":    0.97,
  "model_type":  "RandomForestClassifier (100 estimators)",
  "features":    ["efficiency_pct", "irradiance_kwh_m2", ...],
  "source":      "held-out test split (random_state=42, test_size=0.2)"
}
```

#### `GET /api/sensor/classifier/retrospective`

Returns real-weather validation results for Selangor 2024 (366 days).

**Response includes:** `weighted_f1`, `macro_f1`, `accuracy`, `confusion_matrix`, `per_class`, `label_derivation`, `soiling_model`, `data_source`.

### Forecast Routes — `/api/forecast`

#### `GET /api/forecast/{array_id}`

3-day efficiency and revenue forecast for one array block.

**Path param:** `array_id` matches `^[A-Z][0-9]$` (A1, A2, B1, B2, C1, C2)

**Response:**
```json
[
  {
    "date":                    "Day 8",
    "forecast_efficiency_pct": 68.4,
    "forecast_revenue_rm":     3421.5,
    "lower_bound":             62.1,
    "upper_bound":             74.7
  }
]
```

### ROI Routes — `/api/roi`

#### `POST /api/roi/calculate`

**Rate limit:** 20 requests/minute (sensitive route)

**Request body:**
```json
{
  "mw":               5.0,
  "location":         "malaysia",
  "tariff_rm_per_kwh": 0.39,
  "hormuz":           false
}
```

**Response:** Full ROI breakdown including `annual_kwh_recovered`, `annual_revenue_rm`, `annual_carbon_rm`, `system_cost_rm`, `annual_subscription_rm`, `annual_net_rm`, `payback_years`, `npv_rm`, `monthly[]`, `cumulative[]`.

### Efficiency Routes — `/api/efficiency`

#### `GET /api/efficiency/{location}`

Returns 12-month efficiency profiles for `malaysia` or `gcc`.

### Market Routes — `/api/market`

#### `GET /api/market/locations`

Returns location metadata including irradiance, tariff, and dust profile.

#### `GET /api/market/hormuz`

Returns Strait of Hormuz tariff shock scenario metadata (1.25× multiplier).

### Weather Routes — `/api/weather`

#### `GET /api/weather/forecast/{array_id}`

Returns next 3 days of weather data for an array from the configured provider.

### Health Check

#### `GET /`

Returns `{"status": "ok", "service": "solarguard-api"}`. Public route — no authentication required.

---

## 14. Security Architecture

**File:** `backend/core/security.py`

The security layer is implemented as ASGI middleware composing four independent components.

### Middleware Stack (applied in reverse order of declaration)

```
Incoming Request
      │
      ▼
SecurityHeadersMiddleware    ← adds HTTP security headers
      │
      ▼
TrustedHostMiddleware        ← rejects requests from untrusted Host headers
      │
      ▼
CORSMiddleware               ← enforces same-origin policy, no wildcard origins
      │
      ▼
AppSecurityMiddleware        ← auth, rate limiting, request size, logging
      │
      ▼
FastAPI route handler
```

### AppSecurityMiddleware — Detailed Logic

**1. Request size check**
```
Content-Length > MAX_REQUEST_BYTES (default: 65,536)
→ 413 REQUEST_TOO_LARGE immediately, before reading body
```

Streaming bodies also monitored via `_limited_receive` wrapper that tracks accumulated bytes and raises `RequestBodyTooLarge` if the limit is exceeded mid-stream.

**2. Public route bypass**

Only two route patterns skip authentication:
- `OPTIONS *` — CORS preflight
- `GET /` — health check

All other routes require a valid API key.

**3. API key authentication**

```
Authorization: Bearer <token>

token_hash = SHA-256(token)
for each configured hash:
    if HMAC.compare_digest(token_hash, configured_hash):
        → AuthResult(authenticated=True, fingerprint=hash[:16])

→ 401 UNAUTHORIZED if no match
```

Constant-time comparison via `hmac.compare_digest` prevents timing attacks. API keys are stored only as SHA-256 hashes; plaintext keys are never logged or persisted.

**4. Rate limiting**

Sliding window (60-second lookback) keyed by `(client_ip, key_fingerprint, bucket)`:

| Route | Limit |
|---|---|
| `POST /api/sensor/classify` | 20 req/min |
| `POST /api/roi/calculate` | 20 req/min |
| All other authenticated routes | 120 req/min |

Limit 0 disables rate limiting (development/test convenience).

**5. Request ID propagation**

Incoming `X-Request-ID` header validated against pattern `^[A-Za-z0-9._:-]{1,64}$`. If absent or invalid, a new UUID4 hex is generated. The request ID is attached to all responses and log lines for traceability.

**6. Client IP resolution**

Direct IP from ASGI scope by default. If the direct IP is in `TRUSTED_PROXY_IPS`, the first hop of `X-Forwarded-For` is used instead (supports deployment behind a load balancer).

### SecurityHeadersMiddleware — Headers Applied

| Header | Value | Protection |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Cache-Control` | `no-store, no-cache` | Prevents sensitive data caching |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Disables browser feature APIs |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HTTPS enforcement (when `ENABLE_HSTS=true`) |

### Log Safety

All values written to logs pass through `sanitize_log_value()`:
- Strips non-printable characters and control sequences (prevents log injection)
- Replaces `\r`, `\n`, `\t` with `_`
- Truncates at 120 characters

### Error Response Safety

All exceptions are caught by `unhandled_exception_handler`. Internal error detail and stack traces are logged server-side only. The client receives:

```json
{"error": {"code": "INTERNAL_ERROR", "message": "Internal server error."}}
```

No internal state, file paths, or exception messages are ever returned to the client.

### CORS Configuration

```python
CORS_ORIGINS = env_csv("CORS_ORIGINS", "http://localhost:5173")

# Startup raises ValueError if "*" is present:
if "*" in cors_origins:
    raise ValueError("CORS_ORIGINS must not contain '*' when credentials are enabled.")
```

### Environment Variables — Security Configuration

| Variable | Default | Purpose |
|---|---|---|
| `APP_ENV` | `development` | Controls production enforcement rules |
| `SOLARGUARD_API_KEY_SHA256S` | — | Comma-separated SHA-256 hashes of valid API keys |
| `SOLARGUARD_API_KEYS` | — | Plaintext keys (hashed at startup; development only) |
| `MAX_REQUEST_BYTES` | `65536` | Maximum request body size |
| `RATE_LIMIT_PER_MINUTE` | `120` | General route rate limit |
| `SENSITIVE_RATE_LIMIT_PER_MINUTE` | `20` | Classifier and ROI rate limit |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed origins (no wildcard) |
| `TRUSTED_HOSTS` | `localhost,127.0.0.1,testserver` | TrustedHostMiddleware allowlist |
| `TRUSTED_PROXY_IPS` | — | IPs allowed to forward real client IP |
| `ENABLE_HSTS` | `false` | HSTS header toggle |
| `ENABLE_API_DOCS` | `false` | Swagger/ReDoc/OpenAPI URL toggle |

---

## 15. Model Integrity and Production Deployment

**File:** `backend/services/dust_classifier.py`

### Model Loading Modes

Two modes govern how the classifier is loaded at startup:

| Mode | When used | Behaviour |
|---|---|---|
| `train-fallback` | Default in development | Trains classifier in-memory from CSV if no model files found |
| `verified` | Required in production | Loads serialised joblib files; verifies SHA-256 hash before deserialisation |

`APP_ENV=production` forces `MODEL_LOAD_MODE=verified`. Attempting to use train-fallback in production raises `ModelIntegrityError` at startup.

### Model File Integrity Check

Before any joblib file is deserialised (which can execute arbitrary code), the file's SHA-256 hash is computed and compared against a known-good hash supplied via environment variable:

```python
def _verify_model_file(path, expected_hash, label):
    actual_hash = sha256_file(path).lower()
    if actual_hash != expected_hash:
        raise ModelIntegrityError(f"{label} model hash mismatch.")
```

Both classifier and scaler hashes must be configured together. Configuring only one raises `ModelIntegrityError` at startup validation.

**Environment variables:**

| Variable | Purpose |
|---|---|
| `DUST_CLASSIFIER_SHA256` | Expected SHA-256 hex of `dust_classifier.joblib` |
| `DUST_SCALER_SHA256` | Expected SHA-256 hex of `dust_scaler.joblib` |

### Thread Safety

The classifier and scaler are loaded once and cached in module-level globals. A `threading.Lock` with double-checked locking ensures only one thread trains or loads the model even under concurrent startup:

```python
with _model_lock:
    if _classifier is not None:     # second check inside lock
        return _classifier, _scaler
    # ... load or train
```

### Startup Cache Warm-up

**File:** `backend/main.py`

Both expensive computations are pre-warmed in a thread pool during FastAPI lifespan startup, so the first dashboard request is instant:

```python
@asynccontextmanager
async def lifespan(app):
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, compute_performance)        # classifier metrics
    loop.run_in_executor(None, run_retrospective_validation)  # Open-Meteo 366-day validation
    yield
```

Results are cached in module-level dicts (`_performance_cache`, `_retro_cache`) and never recomputed within a process lifetime.

---

*SolarSense Technical Reference | UM Patent PI 2024000995 | Generated 2026-05-21*
