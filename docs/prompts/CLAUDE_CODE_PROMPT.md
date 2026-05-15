# SolarGuard — Claude Code Implementation Prompt

You are building a full-stack solar panel O&M intelligence platform called **SolarGuard** for a university hackathon (MASA/UMDT). The project is based on two real patents from Universiti Malaya:
- **PI 2024000995** — Automated Solar Panel Cleaning System (TRL 8, the hardware that actually cleans)
- **UI 2023002890** — Solar-Heat-Water Harvester (TRL 3, supplies rainwater to the cleaner)

The repo already exists at `./solarguard/`. Your job is to build 8 new features inside it. Read the entire prompt before writing a single line of code. Then implement everything in the order given.

---

## Existing repo structure (do not delete or overwrite existing files unless told to)

```
solarguard/
├── frontend/                  ← Vite + React 18 + Recharts + Tailwind
│   └── src/
│       ├── App.jsx
│       ├── components/Dashboard.jsx   ← existing ROI dashboard (keep it, add a tab)
│       ├── constants/marketData.js
│       └── utils/roiCalculations.js
├── backend/                   ← Python FastAPI
│   ├── main.py
│   ├── models/farm.py
│   └── services/
│       ├── degradation_model.py
│       ├── roi_calculator.py
│       └── carbon_calculator.py
└── data/
    ├── processed/             ← 10 CSVs already generated (Malaysia + GCC, 1–50 MW)
    └── scripts/generate_dataset.py
```

---

## Tech stack — do not change, do not add new frameworks

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Recharts, Tailwind CSS |
| Backend | Python 3.11, FastAPI, Pydantic v2, Pandas, NumPy |
| ML | scikit-learn (Random Forest, LinearRegression), no PyTorch, no TensorFlow |
| Styling | Tailwind utility classes only — no additional CSS libraries |
| Charts | Recharts only — no D3, no Chart.js |

---

## Malaysia-accurate mock dataset — generate this first before any UI work

Before touching any React component, generate a Python script at `data/scripts/generate_sensor_data.py` that produces all mock sensor CSVs. The data must reflect real Malaysian solar farm conditions:

### Malaysia climate parameters to encode
- **Peak irradiance**: 4.2–5.6 kWh/m²/day (use 4.5 as daily baseline, ±20% stochastic variation)
- **Temperature**: 27–33°C ambient, panels run 15°C above ambient under full sun
- **Humidity**: 70–90% baseline; spikes to 95–100% during rain events
- **Rainfall**: bimodal — SW monsoon (May–Sep) and NE monsoon (Nov–Mar). In monsoon months probability of a rain day = 65%; dry months = 25%.
- **Rain effect on dust**: a rain event of >8mm resets panel soiling by 70–90% (partial natural cleaning). Rain <8mm does not clean but raises humidity, making dust stickier.
- **Dust accumulation rate**: 0.3–0.8% efficiency loss per dry day (higher near construction sites or roads). Accumulates until either cleaned or a heavy rain event occurs.
- **Baseline clean panel efficiency**: 97–98% of rated capacity.
- **Grid emission factor**: 0.585 kg CO₂/kWh (TNB SESB 2022).
- **Energy tariff**: RM 0.39/kWh (use this for all revenue calculations in the IoT features — this is LSS commercial rate).

### Dataset 1 — 7-day dusty week scenario (save as `data/processed/scenario_dusty_week.csv`)
Simulate Farm A, 7 days, no rain, dry season (July). Six panel arrays: A1, A2, B1, B2, C1, C2. Each has hourly readings (07:00–19:00 = 13 data points per day = 91 rows per array = 546 total rows).

Columns: `timestamp, array_id, irradiance_kwh_m2, temp_c, humidity_pct, cloud_cover_pct, rainfall_mm, actual_output_kwh, expected_output_kwh, efficiency_pct, soiling_loss_pct, dust_flag (1=dust, 0=weather/normal), rain_event (bool)`

Make arrays degrade at different rates so the grid looks realistic:
- A1: starts clean (97%), degrades to 61% by day 7 (heaviest dust — near road)
- A2: starts 94%, degrades to 78% by day 7
- B1: starts 96%, degrades to 88% by day 7
- B2: starts 91%, degrades to 72% by day 7
- C1: starts 95%, stable — partial cleaning by light wind on day 4, stays at 89%
- C2: starts 98%, degrades to 83% by day 7

Use a Gaussian noise function (σ = 0.5%) on all efficiency readings for realism. Apply the irradiance bell curve across the day (peak at 12:00, tapering toward 07:00 and 19:00 using a sin² function). Output power = (irradiance × panel_area_m2 × efficiency_pct / 100). Use panel_area_m2 = 2000 per array (approximate 1 MW array footprint).

### Dataset 2 — 7-day rainy week scenario (save as `data/processed/scenario_rainy_week.csv`)
Same farm, same arrays, but Northeast monsoon week (December). Same columns. Rain events on day 2 (18mm — cleans 80% of dust) and day 5 (6mm — no cleaning, raises humidity). All arrays start moderately dusty (85–91% efficiency). After the day-2 rain event, all arrays recover to 92–96%. Cloud cover on days 2 and 5 drops irradiance to 40–60% of baseline for 6–8 hours.

### Dataset 3 — 3-day forecast input (save as `data/processed/forecast_input.csv`)
Take the last 3 days of the dusty week dataset for array A1 only. Add a weather forecast column: `forecast_cloud_cover_pct, forecast_rain_prob_pct, forecast_irradiance_kwh_m2`. Generate plausible 3-day forward forecasts (no rain, irradiance 4.2–4.8, cloud cover 15–30%).

---

## Feature 1 — Panel efficiency heatmap with live IoT simulation

**File to create**: `frontend/src/components/PanelHeatmap.jsx`

Build a 2×3 grid of panel array cards (A1, A2, B1, B2, C1, C2). Each card shows:
- Array ID as the header (bold, large)
- Current efficiency % (large number, colour-coded)
- A thin horizontal efficiency bar
- A "Clean this panel" button that appears only when efficiency < 90%
- Status label: "Clean" / "Dust suspected" / "Heavy loss"

Colour coding (use Tailwind bg classes, no inline hex):
- ≥ 90%: green card border + green text
- 60–89%: amber card border + amber text
- < 60%: red card border + red text

**Stat row above the grid** — three live numbers that update as panels are cleaned:
- "RM lost today" — sum of (expected_output − actual_output) × RM 0.39 across all arrays for today
- "Arrays needing cleaning" — count of arrays below 90%
- "RM saved if cleaned now" — projected RM recovery if all dirty arrays were restored to 97%

**"Clean all dirty panels" button** at the top right. When clicked, triggers the cleaning animation on all arrays below 90% simultaneously.

**Cleaning animation**: when "Clean this panel" or "Clean all" is triggered:
1. The card briefly flashes a blue border (CSS transition, 300ms)
2. A small water-drop icon animates downward across the card (CSS keyframe, 600ms)
3. After 900ms total, the efficiency resets to 97% and the card turns green
4. The stat row updates immediately after all animations complete

**Click to expand**: clicking any array card (not the clean button) toggles open a 7-day efficiency bar chart below the grid for that array. Use Recharts `BarChart`. Each bar is one day's average efficiency, colour-coded the same way (green/amber/red). Only one array can be expanded at a time.

**IoT simulation mode**: In demo mode (controlled by a `demoMode` boolean state in the parent), the component reads from the dusty-week dataset and cycles through it using `setInterval` every 3 seconds, simulating a live sensor feed. Each tick advances one hour of readings. The panel cards update their efficiency values in real time. Add a "Demo mode" toggle button at the top of the heatmap. When demo mode is OFF, the component shows static data from the last row of the dataset.

**Production note (add as a JSDoc comment inside the component)**: In production, replace the `setInterval` mock with a WebSocket connection or a polling `fetch` to `GET /api/sensor/latest` — the API shape is identical to the mock data structure.

---

## Feature 2 — Dust vs weather classifier

**Backend file to create**: `backend/services/dust_classifier.py`

Train a Random Forest classifier using the two scenario datasets (dusty week + rainy week). Features to use: `efficiency_pct, irradiance_kwh_m2, cloud_cover_pct, humidity_pct, rainfall_mm, soiling_loss_pct`. Target: `dust_flag` (1 = dust, 0 = weather/normal).

Use `scikit-learn`:
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
```

- Train on both scenario CSVs concatenated
- Use 80/20 train/test split with `random_state=42`
- Save the trained model and scaler using `joblib` to `backend/models/dust_classifier.joblib` and `backend/models/dust_scaler.joblib`
- The service must expose a `classify(reading: dict) -> dict` function that returns:
  - `type`: `"dust"` | `"weather"` | `"normal"`
  - `confidence`: float 0–1 (from `predict_proba`)
  - `cause`: a one-line plain English string explaining the classification

Cause strings to use:
- If dust + confidence > 0.85: `"Sustained efficiency drop without cloud cover — dust accumulation confirmed."`
- If dust + confidence 0.6–0.85: `"Likely dust — monitor for another 2 hours before triggering clean."`
- If weather: `"Temporary output drop from cloud cover or rain — no cleaning needed."`
- If normal: `"Panel output within expected range. No action required."`

**API route to create**: `backend/api/routes/sensor.py`

Add `POST /api/sensor/classify` that accepts `{ array_id, efficiency_pct, irradiance_kwh_m2, cloud_cover_pct, humidity_pct, rainfall_mm, soiling_loss_pct }` and returns the classifier output. Also add `GET /api/sensor/latest` that returns the most recent row from the dusty-week dataset for all 6 arrays (used by the frontend IoT simulation fallback).

Register the new router in `backend/main.py`.

**Frontend component**: `frontend/src/components/DustClassifier.jsx`

A card that runs a classification on the currently selected array (or A1 by default). Shows:
- Array ID
- Classifier result type as a badge: dust (red) / weather (blue) / normal (green)
- Confidence as a percentage with a thin progress bar
- The one-line cause string
- Timestamp of the last reading

On page load and every 10 seconds in demo mode, auto-classify array A1 using the most recent reading. Allow clicking any array in the heatmap to cross-trigger a classification of that array.

---

## Feature 3 — Cleaning recommendation card

**File to create**: `frontend/src/components/RecommendationCard.jsx`

Takes props: `{ arrayId, classifierResult, efficiencyPct, forecastTrend }`.

Structure:
- Bold header: `"⚠ Action required — [Array ID]"` (amber) or `"✓ No action needed"` (green)
- What is happening: one sentence. Example: `"Array A1 has confirmed dust accumulation at 61% efficiency."`
- RM impact this week: calculated as `(0.97 − efficiencyPct/100) × dailyKwh × 7 × 0.39`. Show as `"Estimated loss if uncleaned: RM [X] this week."`
- Forecast urgency: if `forecastTrend === "declining"`, add: `"Forecast shows continued degradation — cleaning recommended today."`
- A prominent "Trigger cleaning for [Array ID]" button that calls the cleaning animation back on the heatmap via a shared state or callback prop.

Keep the text short. Max 4 lines total. Judges will screenshot this card.

---

## Feature 4 — 7-day energy timeline chart

**File to create**: `frontend/src/components/EnergyTimeline.jsx`

Props: `{ arrayId, scenario }` where scenario is `"dusty"` or `"rainy"`.

Recharts `LineChart` with two lines:
- **Actual output** (solid line, `#1D9E75`)
- **Expected output** (dashed line, `#6B7280`)

X-axis: dates (Day 1–Day 7). Y-axis: kWh output (daily totals, summed from hourly rows).

Annotations — use Recharts `ReferenceLine` with a label:
- In dusty scenario: add a vertical `ReferenceLine` on Day 5 with label `"Dust drop"` (amber)
- In rainy scenario: add `ReferenceLine` on Day 2 with label `"Rain event — natural cleaning"` (blue) and on Day 5 with label `"Light rain — humidity spike"` (grey)

The gap between the two lines (shaded area using a Recharts `AreaChart` layered underneath) represents the revenue loss. Show this shaded gap in red at 15% opacity.

Below the chart, show one summary line: `"Gap this week: [X] kWh = RM [Y] lost"` where Y = X × 0.39.

---

## Feature 5 — 3-day efficiency forecast

**Backend file to create**: `backend/services/forecaster.py`

Train a `sklearn.linear_model.LinearRegression` model on the last 7 days of efficiency data for one array. Features: `[day_index, cloud_cover_pct, humidity_pct, rainfall_mm, irradiance_kwh_m2]`. Target: `efficiency_pct`.

Expose `forecast(array_id: str, days: int = 3) -> list[dict]` that returns a list of 3 dicts: `{ date, forecast_efficiency_pct, forecast_revenue_rm, lower_bound, upper_bound }`. Compute uncertainty bounds as ±1.5 standard deviations of residuals.

Add `GET /api/forecast/{array_id}` route in `backend/api/routes/sensor.py`.

**Frontend**: extend `EnergyTimeline.jsx` to append the 3-day forecast as a dashed continuation after Day 7. Use a different line colour (`#D85A30`, dashed) for forecast efficiency. Add a shaded confidence band using a Recharts custom layer or two `Area` components. After the chart, show: `"If uncleaned: projected efficiency in 3 days = [X]%"`. If projected efficiency < 75%, set `forecastTrend = "declining"` and pass to RecommendationCard.

---

## Feature 6 — Revenue loss summary cards

**File to create**: `frontend/src/components/RevenueSummary.jsx`

Three Tailwind cards in a row:

1. **RM lost today** (red `text-red-600`): `sum of (expected − actual) × 0.39` for all 6 arrays, today only (last hourly reading × 13 hours as proxy)
2. **RM lost this week** (red `text-red-600`): same calculation but over all 7 days
3. **RM saved if cleaned now** (green `text-green-600`): `sum of (0.97 − current_efficiency/100) × daily_expected_kwh × 7 × 0.39` across all arrays below 90%

Each card:
- Big number (text-2xl font-bold)
- Label below (text-xs uppercase tracking-widest)
- A small sparkline below the number using a Recharts `LineChart` (50px tall, no axes, just the line) showing the daily RM loss trend over the 7-day period

All three cards update live as panels are cleaned in Feature 1.

---

## Feature 7 — Demo scenario toggle

**File to create**: `frontend/src/components/ScenarioToggle.jsx`

A toggle button group at the very top of the IoT Dashboard tab:
- "🌵 Dusty week (Farm A — July)" — loads scenario_dusty_week.csv data
- "🌧 Rainy week (Farm A — December)" — loads scenario_rainy_week.csv data

When the scenario changes:
1. All 6 panel cards in the heatmap reset to the first day of the selected scenario
2. The EnergyTimeline chart re-renders with the new scenario's 7-day data
3. The classifier re-runs on A1's first reading from the new scenario
4. The RecommendationCard updates
5. The RevenueSummary recalculates
6. Demo mode (if active) restarts the sensor cycle from hour 1 of the new scenario

Use React context (`SensorContext`) to manage scenario data and current sensor state so all 6 components share it without prop-drilling.

---

## Feature 8 — ROI payback calculator

**File to create**: `frontend/src/components/PaybackCalculator.jsx`

This extends the existing `Dashboard.jsx`. Add it as a section below the existing charts (do not replace anything in Dashboard.jsx).

Layout:
- **Slider**: "Farm size" 1–100 MW (step 1)
- **Dropdown**: Market — Malaysia (RM 0.39/kWh, 17% avg dust loss) / GCC (RM 0.42/kWh, 30% avg dust loss)
- **Hormuz toggle**: apply +25% tariff multiplier (reuse from marketData.js)
- **Computed outputs** (update live as slider moves):
  - Annual revenue loss from dirty panels (RM) = MW × 1000kW × 4.5h × 365days × dustLossPct × tariff
  - Annual revenue recovered with SolarGuard = above × 0.85 (system recovers 85% of dust loss per IP spec)
  - System cost = MW × RM 120,000
  - Annual O&M = MW × RM 15,000
  - Net annual benefit = revenue recovered − O&M
  - **Payback period** (years) = system cost ÷ net annual benefit — display large, bold, in green if < 3 years, amber if 3–5, red if > 5
  - 5-year NPV at 10% discount rate

- **Payback bar**: a horizontal progress bar from 0 to 10 years. Fill colour matches the payback colour. A vertical tick marks the 3-year "excellent ROI" threshold.
- **Carbon credit add-on**: show additional annual value from carbon credits at RM 40/tonne. Use 0.585 kg CO₂/kWh × recovered kWh.
- **One-line pitch** auto-generated below: `"A [X] MW farm loses RM [Y]/yr to dust. SolarGuard recovers RM [Z]/yr with a [N]-year payback."`

---

## App-level integration — wire everything together

**Update `frontend/src/App.jsx`** to have two tabs:
1. **"IoT Dashboard"** — contains (in this order top to bottom): ScenarioToggle, RevenueSummary, PanelHeatmap, DustClassifier, RecommendationCard, EnergyTimeline (with 3-day forecast appended)
2. **"Commercial Model"** — contains the existing Dashboard.jsx content + PaybackCalculator at the bottom

Use a simple tab bar at the top of the page (two buttons, Tailwind styled). Tab state lives in App.jsx.

Wrap the IoT Dashboard tab contents in `<SensorContext.Provider>` so all IoT components share scenario and sensor state.

---

## `SensorContext.jsx` — create this file

**File**: `frontend/src/context/SensorContext.jsx`

Manages:
- `scenario`: `"dusty"` | `"rainy"` (default `"dusty"`)
- `scenarioData`: the loaded CSV data for the current scenario (array of row objects)
- `currentHour`: integer 0–90 (index into the time series)
- `demoMode`: boolean (default false)
- `arrayEfficiencies`: `{ A1, A2, B1, B2, C1, C2 }` — current efficiency for each array
- `selectedArray`: which array is expanded/selected (default `"A1"`)
- `cleanedArrays`: Set of array IDs that have been manually cleaned this session
- `classifierResult`: latest result from the dust classifier for selectedArray
- `forecastTrend`: `"declining"` | `"stable"` | `"improving"` for selectedArray

Expose a `triggerClean(arrayId)` function that sets that array's efficiency to 97% and adds it to `cleanedArrays`. When `demoMode` is true, start a `setInterval` that increments `currentHour` every 3 seconds and updates `arrayEfficiencies` from `scenarioData`. Clear interval when `demoMode` is false or on unmount. When `scenario` changes, reset `currentHour` to 0 and reload `scenarioData`.

---

## Backend — update `backend/requirements.txt`

Add these lines (do not remove existing lines):
```
scikit-learn==1.5.0
joblib==1.4.2
```

---

## Backend — train and serialise ML models on startup

In `backend/main.py`, add a startup event that:
1. Calls `dust_classifier.train_and_save()` if `backend/models/dust_classifier.joblib` does not exist
2. This prevents re-training on every restart but trains automatically on first run

The train function reads both scenario CSVs from `data/processed/`, concatenates them, trains the RandomForest, and saves with joblib. Print training accuracy to stdout.

---

## Data loading in frontend

In `frontend/src/utils/loadScenario.js` (create this file), write a function `loadScenario(scenario)` that fetches the correct CSV from `public/data/scenario_[dusty|rainy]_week.csv`. Copy both CSVs to `frontend/public/data/` so Vite serves them statically. Parse with PapaParse (`import Papa from "papaparse"` — add `papaparse` to package.json). Return an array of row objects with numeric fields cast to float.

---

## File summary — everything to create or modify

### New files (create from scratch)
```
frontend/src/components/PanelHeatmap.jsx
frontend/src/components/DustClassifier.jsx
frontend/src/components/RecommendationCard.jsx
frontend/src/components/EnergyTimeline.jsx
frontend/src/components/RevenueSummary.jsx
frontend/src/components/ScenarioToggle.jsx
frontend/src/components/PaybackCalculator.jsx
frontend/src/context/SensorContext.jsx
frontend/src/utils/loadScenario.js
frontend/public/data/scenario_dusty_week.csv   ← copy from data/processed/
frontend/public/data/scenario_rainy_week.csv   ← copy from data/processed/
backend/services/dust_classifier.py
backend/services/forecaster.py
backend/api/routes/sensor.py
backend/models/                                ← directory for .joblib files
data/scripts/generate_sensor_data.py
```

### Files to modify (extend, do not replace)
```
frontend/src/App.jsx              ← add tab bar, SensorContext.Provider, IoT tab
frontend/package.json             ← add papaparse
backend/main.py                   ← register sensor router, add startup event
backend/requirements.txt          ← add scikit-learn, joblib
```

---

## Implementation order — follow this exactly

1. `data/scripts/generate_sensor_data.py` — run it and verify CSVs are generated correctly
2. Copy CSVs to `frontend/public/data/`
3. `backend/services/dust_classifier.py` (train + save)
4. `backend/services/forecaster.py`
5. `backend/api/routes/sensor.py` + register in `main.py`
6. `frontend/src/utils/loadScenario.js`
7. `frontend/src/context/SensorContext.jsx`
8. `frontend/src/components/RevenueSummary.jsx`
9. `frontend/src/components/PanelHeatmap.jsx`
10. `frontend/src/components/DustClassifier.jsx`
11. `frontend/src/components/EcommendationCard.jsx`
12. `frontend/src/components/EnergyTimeline.jsx` (include forecast)
13. `frontend/src/components/ScenarioToggle.jsx`
14. `frontend/src/components/PaybackCalculator.jsx`
15. `frontend/src/App.jsx` — wire all tabs

---

## Quality requirements — enforce on every file

- **No placeholder comments** like `// TODO` or `// implement this`. Every function must be fully implemented.
- **No hardcoded magic numbers** that belong in constants. All tariffs, irradiance values, emission factors, and cost constants go in `frontend/src/constants/marketData.js` (add new keys there, do not duplicate).
- **All monetary values in RM** formatted with `toLocaleString("en-MY")` and `"RM "` prefix.
- **All efficiency values** clamped between 0 and 100 before rendering.
- **Recharts tooltips** must show units (kWh, %, RM) in the formatter.
- **Tailwind only** for styling — no inline style objects except where Recharts requires a colour string.
- **Every component** must handle the loading state (show a skeleton or spinner if data is not yet loaded).
- **SensorContext** must use `useReducer`, not a pile of `useState` calls, because it manages many related state fields.
- **The classifier and forecaster** must not crash if the CSV data is missing — return a safe default and log a warning.
- **Run `npm run build`** at the end and confirm zero build errors before reporting done.

---

## What judges will look at (keep this in mind while building)

From the hackathon scoring framework:
- **Is the IP the core of the solution?** — The cleaning trigger in Feature 1 directly invokes the UM PI 2024000995 hardware. Make this explicit in UI copy.
- **Is your TRL honest?** — The heatmap is a simulation of TRL 8 hardware. Label it "Demo mode — production connects to patent hardware sensors".
- **Can you name real buyers?** — The PaybackCalculator output names TNB Renewables and Solarvest as example buyers in the one-line pitch when MW > 10.
- **Do you know your numbers?** — RevenueSummary cards show RM, not percentages. The payback calculator must be live and accurate.
- **Team execution** — The classifier confidence score and forecast trend are the deep tech signals. Make them prominent.

---

*End of prompt. Begin with step 1.*
