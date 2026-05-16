# SolarGuard Backend→Frontend Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the SolarGuard FastAPI backend to the React/Vite frontend so that all sensor, classification, forecast, weather, ROI, and status data are served from the real backend API endpoints, with no silent mock fallback and no misleading "live data" labels for July 2024 CSV demo rows.

**Architecture:** The frontend already has a fully-wired `useSolarGuardData` hook, `api.ts` wrapper, `DataStatusBanner`, and Sidebar data-source display. Most of the required integration is already implemented. The remaining work is: (1) create the `.env` file that the backend `load_local_env()` reads so `dev-local-key` is recognised; (2) fix a unit-conversion bug in the forecast adapter that puts efficiency percentages (0–100) into kWh fields; (3) remove one dead UI component with misleading text; and (4) fix one static alert label.

**Tech Stack:** FastAPI + Uvicorn (Python), React + Vite + TypeScript (frontend), Recharts (charts), pytest (backend tests), `tsc --noEmit` (frontend typecheck).

---

## File Map

| Action | Path | What changes |
|---|---|---|
| Create | `.env` (repo root, gitignored) | Backend `load_local_env()` reads this; sets `SOLARGUARD_API_KEYS=dev-local-key` |
| Modify | `frontend/src/components/Dashboard.tsx:226–246` | Fix forecast adapter: derive kWh from `forecast_revenue_rm / 0.39` instead of using efficiency % directly |
| Delete | `frontend/src/components/PageHeader.tsx` | Dead component (never imported/used), contains hardcoded "Simulated IoT Feed" |
| Modify | `frontend/src/components/pages/PanelDetailPage.tsx:112` | Static alert "Weather forecast updated automatically" → "Weather source: demo CSV" |

---

## Task 1 — Create root `.env` so the backend loads `dev-local-key`

**Context:** `backend/main.py::load_local_env()` reads `<repo_root>/.env` using
`Path(__file__).parents[1] / ".env"`. The root `.env.example` already contains the right values. The `.env` file is gitignored; it must be created locally by each developer. Without it, `SOLARGUARD_API_KEYS` is never set, `api_key_hashes` is an empty tuple, and every protected API call returns 401.

**Files:**
- Create: `.env` (repo root)

- [ ] **Step 1 — Verify `.env.example` is correct**

  Read `.env.example` at repo root. Confirm line `SOLARGUARD_API_KEYS=dev-local-key` and `APP_ENV=development` are present. No code change needed; this is a visual check.

- [ ] **Step 2 — Create `.env` from `.env.example`**

  Run from the repo root:
  ```powershell
  Copy-Item .env.example .env
  ```

  Expected: `.env` now exists at repo root with contents identical to `.env.example`.

- [ ] **Step 3 — Start the backend and verify the health endpoint**

  ```powershell
  cd backend
  uvicorn main:app --reload --host 127.0.0.1 --port 8000
  ```

  In a second terminal:
  ```powershell
  Invoke-RestMethod -Uri http://127.0.0.1:8000/
  ```

  Expected output:
  ```
  status  service
  ------  -------
  ok      solarguard-api
  ```

- [ ] **Step 4 — Verify a protected endpoint accepts `dev-local-key`**

  ```powershell
  Invoke-RestMethod -Uri http://127.0.0.1:8000/api/sensor/latest `
    -Headers @{ Authorization = "Bearer dev-local-key" }
  ```

  Expected: JSON array of 6 `SensorReading` objects (one per array A1–C2). No 401 error.

- [ ] **Step 5 — Verify a wrong key is rejected visibly**

  ```powershell
  Invoke-RestMethod -Uri http://127.0.0.1:8000/api/sensor/latest `
    -Headers @{ Authorization = "Bearer wrong-key" }
  ```

  Expected: HTTP 401 with `{"error": {"code": "UNAUTHORIZED", "message": "Unauthorized."}}`.

- [ ] **Step 6 — Start the frontend and verify dashboard loads backend data**

  ```powershell
  cd frontend
  npm install
  npm run dev
  ```

  Open the printed Vite URL (default `http://localhost:5173`). Expected:
  - `DataStatusBanner` shows green "Backend connected" or "Backend connected - demo CSV"
  - Sidebar footer shows "Backend demo CSV"
  - No 401 or network error in browser console

- [ ] **Step 7 — Commit**

  ```bash
  git add .env.example
  git commit -m "chore: confirm root .env.example wires dev-local-key for backend auth"
  ```

  Note: `.env` itself must NOT be committed (it is in `.gitignore`).

---

## Task 2 — Fix forecast adapter: efficiency% → kWh

**Context:** `Dashboard.tsx` lines 226–246 map backend `ForecastPoint` objects onto the
frontend's `ForecastPoint = { day, expected, forecast }` shape. The current code writes
`expected: Math.round(f.upper_bound)` (an efficiency percentage, e.g. 82) and
`forecast: Math.round(f.forecast_efficiency_pct)` (e.g. 74) directly into fields the
rest of the app treats as **kWh** values. This makes `getForecastLoss` in
`PanelManagementPage.tsx` report ~3 RM per day instead of ~100–300 RM, and the
`forecastIsDeclining()` comparison still works but on wrong-unit values.

The backend's `services/forecaster.py` uses `LSS_TARIFF_RM = 0.39` to convert
`efficiency_pct × irradiance × PANEL_AREA_M2` into revenue. We can invert this:
`kWh = forecast_revenue_rm / 0.39`. The upper-bound kWh scales proportionally:
`upper_kWh = (upper_bound / forecast_efficiency_pct) × forecast_kWh`.

This is the "remove the demo scaling" fix the spec refers to.

**Files:**
- Modify: `frontend/src/components/Dashboard.tsx:226–246`

- [ ] **Step 1 — Locate and read the current forecast adapter**

  In `Dashboard.tsx`, find the block that starts with:
  ```typescript
  if (source === "backend" && backendForecast) {
    adaptedPanel.forecast = backendForecast.map((f, i) => {
  ```
  Confirm it ends at roughly line 246 with `} as any;`. The current code assigns
  `expected: Math.round(f.upper_bound)` and `forecast: Math.round(f.forecast_efficiency_pct)`.

- [ ] **Step 2 — Write the failing check (manual verification step)**

  With the backend running and frontend open, navigate to the **Farm Map** page and
  check the priority scores for any panel. The "Forecast loss" column should show
  unrealistically small values (~RM 3–10 total for 3 forecast days on a 5 MW farm
  array). Note this as the "before" value.

- [ ] **Step 3 — Apply the fix in `Dashboard.tsx`**

  Replace the forecast adapter block (lines 226–246) with:

  ```typescript
  if (source === "backend" && backendForecast) {
    const BACKEND_LSS_TARIFF = 0.39; // matches services/forecaster.py LSS_TARIFF_RM
    adaptedPanel.forecast = backendForecast.map((f) => {
      const forecastKwh = Math.round(f.forecast_revenue_rm / BACKEND_LSS_TARIFF);
      const upperKwh =
        f.forecast_efficiency_pct > 0
          ? Math.round((f.upper_bound / f.forecast_efficiency_pct) * forecastKwh)
          : forecastKwh;
      return { day: f.date, expected: upperKwh, forecast: forecastKwh };
    });
  }
  ```

  **What changed:**
  - `expected` is now kWh derived from `upper_bound / forecast_efficiency_pct × forecastKwh`
  - `forecast` is now kWh derived from `forecast_revenue_rm / 0.39`
  - Removed the `as any` cast (the return type now correctly matches `ForecastPoint`)
  - Removed the unused `weatherLabel` block (backend weather is handled separately via `panel.weatherRows`)
  - Removed extra fields `lowerBound`, `upperBound`, `revenue`, `weather` that were never part of the `ForecastPoint` type

- [ ] **Step 4 — Run TypeScript typecheck**

  ```powershell
  cd frontend
  npm run typecheck
  ```

  Expected: The forecast adapter block no longer reports `as any` type errors. If other
  `as any` issues surface (e.g. `roi as any` at line 329 or `classifier.type as any`
  at line 204), see the fix in Task 6.

- [ ] **Step 5 — Verify in browser (manual check)**

  Reload the frontend. Navigate to **Farm Map**. The priority queue "Forecast loss"
  values should now be in the range RM 50–500 per panel over 3 forecast days (for a
  5 MW farm), not RM 3–10.

- [ ] **Step 6 — Commit**

  ```bash
  git add frontend/src/components/Dashboard.tsx
  git commit -m "fix: derive forecast kWh from backend revenue_rm / tariff, remove efficiency% scale error"
  ```

---

## Task 3 — Delete dead `PageHeader.tsx` component

**Context:** `frontend/src/components/PageHeader.tsx` defines a component that is
**never imported or rendered anywhere** in the application (confirmed by grep: zero
import hits). It hardcodes two badges: "Demo Mode: Simulated IoT Feed" and
"Weather Forecast: Auto Input", plus a static summary "Farm A: stable irradiance,
low rain risk". These labels would be actively misleading if the component were ever
activated. Since it is dead code and has no callers, the safest action is deletion.

**Files:**
- Delete: `frontend/src/components/PageHeader.tsx`

- [ ] **Step 1 — Confirm zero imports**

  ```powershell
  Select-String -Path "frontend\src\**\*.tsx", "frontend\src\**\*.ts" `
    -Pattern "PageHeader" -Recurse
  ```

  Expected: Only the definition line in `PageHeader.tsx` itself. No imports elsewhere.

- [ ] **Step 2 — Delete the file**

  ```powershell
  Remove-Item "frontend\src\components\PageHeader.tsx"
  ```

- [ ] **Step 3 — Verify typecheck still passes**

  ```powershell
  cd frontend
  npm run typecheck
  ```

  Expected: No new errors (no other file depended on this export).

- [ ] **Step 4 — Commit**

  ```bash
  git add -u frontend/src/components/PageHeader.tsx
  git commit -m "remove: delete unused PageHeader component with hardcoded IoT feed labels"
  ```

---

## Task 4 — Fix static alert text in `PanelDetailPage.tsx`

**Context:** `PanelDetailPage.tsx` line 112 has a hardcoded alert entry:
```typescript
{
  severity: "info",
  title: "Weather forecast updated automatically",
  time: "12:00",
},
```
The phrase "updated automatically" implies a live automated weather feed. Since all
weather data comes from a CSV (or optional OpenWeather API), this text is misleading.
Replace it with a neutral label.

**Files:**
- Modify: `frontend/src/components/pages/PanelDetailPage.tsx:112`

- [ ] **Step 1 — Locate the alert**

  In `PanelDetailPage.tsx`, find the `alerts` array (around line 99–115). The third
  entry has `title: "Weather forecast updated automatically"`.

- [ ] **Step 2 — Replace the alert title**

  Change line 112 from:
  ```typescript
  title: "Weather forecast updated automatically",
  ```
  to:
  ```typescript
  title: weatherRows.length === 0 ? "Weather source unavailable" : "Weather source: demo CSV",
  ```

  This uses the already-computed `weatherRows` variable (defined at line 52 of the
  same function) so no new imports or state are needed.

- [ ] **Step 3 — Run typecheck**

  ```powershell
  cd frontend
  npm run typecheck
  ```

  Expected: No new errors.

- [ ] **Step 4 — Commit**

  ```bash
  git add frontend/src/components/pages/PanelDetailPage.tsx
  git commit -m "fix: replace static weather auto-update alert with demo CSV / unavailable label"
  ```

---

## Task 5 — Run backend tests and fix any failures

**Context:** The backend uses `pytest`. The `conftest.py` sets
`APP_ENV=test`, `MODEL_LOAD_MODE=train-fallback`, and
`SOLARGUARD_API_KEYS=test-api-key`. Tests do not read the root `.env` (the
`load_local_env()` function skips execution when `APP_ENV=test`). All tests should
pass from a clean checkout.

**Files:**
- No code changes expected. If tests fail, fix the underlying issue before moving on.

- [ ] **Step 1 — Install backend dependencies**

  ```powershell
  cd backend
  pip install -r requirements.txt
  ```

  Or if using a virtual environment:
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  ```

- [ ] **Step 2 — Run the full pytest suite**

  ```powershell
  python -m pytest tests/ -v
  ```

  Expected: All tests PASS. Typical output ending with something like:
  ```
  ============================= N passed in Xs ==============================
  ```

- [ ] **Step 3 — If any test fails**

  Read the failure message carefully. Common causes:
  - Missing CSV file: check `data/processed/scenario_dusty_week.csv` and
    `data/processed/scenario_rainy_week.csv` exist.
  - Model training error: check `MODEL_LOAD_MODE=train-fallback` is not overridden.
  - Import error: run `python -m pytest tests/test_imports.py -v` in isolation.

  Fix the root cause; do not skip tests.

- [ ] **Step 4 — Commit (only if a fix was needed)**

  ```bash
  git add <changed files>
  git commit -m "fix: resolve backend test failure — <describe what you fixed>"
  ```

---

## Task 6 — Run frontend TypeScript typecheck and fix any type errors

**Context:** `npm run typecheck` runs `tsc --noEmit`. The two `as any` casts remaining
in `Dashboard.tsx` after Task 2 are at lines 204 (`classifier.type as any`) and
329 (`roi as any`). These suppress real type mismatches. If `tsc` reports errors on
these, fix them using the instructions below.

**Files:**
- Possibly modify: `frontend/src/components/Dashboard.tsx`

- [ ] **Step 1 — Run typecheck**

  ```powershell
  cd frontend
  npm run typecheck
  ```

  If it exits 0 with no output: done. Skip to Task 7.

- [ ] **Step 2 — Fix `classifier.type as any` (line ~204) if reported**

  The issue: `classifier` is `UiClassification` from `useSolarGuardData.ts` whose
  `type` field is `ClassificationType` (imported from `mockSolarData.ts`). The panel's
  `classifier.type` field is also `ClassificationType` from the same file. Since both
  are the same type, the cast is unnecessary.

  Change:
  ```typescript
  classifier: {
    type: classifier.type as any,
    confidence: classifier.confidence,
    cause: classifier.cause,
  },
  ```
  to:
  ```typescript
  classifier: {
    type: classifier.type,
    confidence: classifier.confidence,
    cause: classifier.cause,
  },
  ```

- [ ] **Step 3 — Fix `roi as any` (line ~329) if reported**

  The issue: `roi` is inferred as a union of two different shapes — the backend branch
  adds `systemCost` which `RoiResult` does not include. The `BusinessRoiPage` receives
  `roi: RoiResult`, but the passed value has an extra `systemCost` key.

  In `solarCalculations.ts`, extend `RoiResult` by adding `systemCost` to `calculateRoi`'s
  return value:

  ```typescript
  // In calculateRoi(), replace the final return statement:
  return {
    annualLoss: annualSavings,
    annualSavings,
    annualKwhRecovered,
    annualCarbon,
    annualNet,
    npv,
    payback,
    systemCost,   // add this line
    monthly,
    cumulative,
    waterSaved,
    waterSelfSupply: market.waterSelfSupply,
    pitch: `...`,
  };
  ```

  Then in `Dashboard.tsx`, remove the `as any` from `roi={roi as any}`:
  ```typescript
  roi={roi}
  ```

  And update `BusinessRoiPage.tsx` prop type to accept `systemCost` in `RoiResult`:
  No change needed — `BusinessRoiPage` accepts `roi: RoiResult` and `RoiResult` is now
  wider. But check: does `BusinessRoiPage` use `roi.systemCost`? If not, it is still
  safe because TypeScript structural typing allows extra fields.

- [ ] **Step 4 — Re-run typecheck until clean**

  ```powershell
  npm run typecheck
  ```

  Expected: exit 0, no output.

- [ ] **Step 5 — Commit if any changes were made**

  ```bash
  git add frontend/src/components/Dashboard.tsx frontend/src/utils/solarCalculations.ts
  git commit -m "fix: remove as-any casts in Dashboard — classifier type and roi shape now aligned"
  ```

---

## Task 7 — Run frontend production build and verify

**Context:** `npm run build` runs `vite build`. It performs TypeScript transpilation
(not a full typecheck, but catches import errors), tree-shaking, and bundling. A clean
build confirms the app is production-ready from a JavaScript/module perspective.

**Files:**
- No code changes expected unless the build surfaces a missing import.

- [ ] **Step 1 — Run the build**

  ```powershell
  cd frontend
  npm run build
  ```

  Expected: Output ends with `✓ built in Xs` and creates `frontend/dist/`.

- [ ] **Step 2 — If the build fails**

  Read the error. Most common causes after the tasks above:
  - Deleted `PageHeader.tsx` is still imported somewhere (run grep to find the import
    and remove it).
  - The forecast adapter returns type incompatible with `ForecastPoint[]` (run
    typecheck first and resolve there).

- [ ] **Step 3 — Smoke-test the production build**

  ```powershell
  npm run preview
  ```

  Open the printed URL. Confirm the dashboard loads and the `DataStatusBanner` renders.
  If the backend is running, it should show "Backend connected - demo CSV" (stale
  July 2024 timestamp is older than 7 days, so `staleBackendData = true`).

- [ ] **Step 4 — Commit dist (if project tracks dist)**

  If `dist/` is gitignored (check `.gitignore`), skip this step. If it is tracked:
  ```bash
  git add frontend/dist
  git commit -m "build: production bundle after backend-frontend integration fixes"
  ```

---

## Acceptance Criteria Checklist

Run through these manually after all tasks complete:

| Criterion | How to verify |
|---|---|
| Dashboard loads backend sensor rows without 401s | Open frontend with backend running; banner shows green "Backend connected" |
| Wrong frontend key shows visible error | Set `VITE_SOLARGUARD_API_KEY=wrong-key` in `frontend/.env`, reload; banner turns red and shows error message |
| `VITE_USE_MOCKS=false` never silently shows mock data | With backend stopped, reload frontend; banner shows red "Backend error" with message, not amber fallback |
| Classification appears in UI from backend | Farm Map shows "Dust / Weather / Normal" badges sourced from `/api/sensor/classify` responses |
| Charts use backend history | 7-day timeline chart data key `"Backend demo CSV signal"` reference line appears (from `EnergyTimelineChart.tsx:27`) |
| No "live sensor feed" claim for July 2024 CSV | DataStatusBanner shows "Backend connected - demo CSV"; PanelDetailPage shows "Backend demo sensor row"; PageHeader.tsx no longer exists |
| Forecast revenue loss is reasonable | Farm Map priority scores show RM 50–500 per panel over 3 days, not RM 3–10 |
| Empty weather shows unavailable, not fake data | With backend returning empty weather array, PanelDetailPage weather shows "Weather unavailable"; banner subtitle shows "weather unavailable" |
| `pytest` passes | All backend tests pass |
| `npm run typecheck` passes | Exit 0 |
| `npm run build` passes | Build produces `dist/` without error |

---

## Out of Scope (do not implement)

- Real SCADA/inverter data ingestion
- Live telemetry (all data comes from July 2024 CSV)
- Production multi-worker rate limiting
- External persistent database
- Full work-order backend persistence (work orders are already labelled "Simulate work order" in the UI)
- `/api/market/locations` frontend wrapper (no unused wrapper exists; YAGNI)
- `DEFAULT_TARIFF_MY` / `DEFAULT_TARIFF_GCC` named constants (these do not exist in the frontend; tariff defaults come from `marketProfiles` in `solarCalculations.ts`)
