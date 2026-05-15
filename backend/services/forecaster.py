import logging
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parents[2] / "data" / "processed"
LSS_TARIFF_RM = 0.39
PANEL_AREA_M2 = 2000
VALID_ARRAYS = {"A1", "A2", "B1", "B2", "C1", "C2"}

_SAFE_DEFAULT = [
    {
        "date": f"Day {i + 8}",
        "forecast_efficiency_pct": 85.0,
        "forecast_revenue_rm": 0.0,
        "lower_bound": 80.0,
        "upper_bound": 90.0,
    }
    for i in range(3)
]


def forecast(array_id: str, days: int = 3) -> list[dict]:
    csv_path = DATA_DIR / "scenario_dusty_week.csv"
    if not csv_path.exists() or array_id not in VALID_ARRAYS:
        logger.warning("Forecast data unavailable for %s; returning safe default.", array_id)
        return _SAFE_DEFAULT[:days]

    df = pd.read_csv(csv_path)
    arr = df[df["array_id"] == array_id].copy()
    if arr.empty:
        return _SAFE_DEFAULT[:days]

    arr["timestamp"] = pd.to_datetime(arr["timestamp"])
    arr["day_idx"] = arr["timestamp"].dt.date.rank(method="dense").astype(int) - 1

    daily = (
        arr.groupby("day_idx")
        .agg(
            efficiency_pct=("efficiency_pct", "mean"),
            cloud_cover_pct=("cloud_cover_pct", "mean"),
            humidity_pct=("humidity_pct", "mean"),
            rainfall_mm=("rainfall_mm", "sum"),
            irradiance_kwh_m2=("irradiance_kwh_m2", "sum"),
        )
        .reset_index()
    )

    feature_cols = ["day_idx", "cloud_cover_pct", "humidity_pct", "rainfall_mm", "irradiance_kwh_m2"]
    X = daily[feature_cols].values
    y = daily["efficiency_pct"].values

    model = LinearRegression()
    model.fit(X, y)
    residuals = y - model.predict(X)
    residual_std = max(float(np.std(residuals)), 0.01)  # ensure non-zero for bounds

    fc_rows = None
    fc_csv = DATA_DIR / "forecast_input.csv"
    if fc_csv.exists() and array_id == "A1":
        fc_df = pd.read_csv(fc_csv)
        fc_df["_date"] = pd.to_datetime(fc_df["timestamp"]).dt.date
        fc_rows = fc_df.groupby("_date").first().reset_index(drop=True)

    last_day = int(daily["day_idx"].max())
    mean_irr = float(daily["irradiance_kwh_m2"].mean())
    results = []

    for i in range(days):
        day_idx = last_day + 1 + i
        if fc_rows is not None and i < len(fc_rows):
            row = fc_rows.iloc[i]
            cloud = float(row.get("forecast_cloud_cover_pct", 20.0))
            humidity = float(row.get("humidity_pct", 75.0))
            rainfall = float(row.get("rainfall_mm", 0.0))
            irradiance = float(row.get("forecast_irradiance_kwh_m2", mean_irr))
        else:
            cloud, humidity, rainfall, irradiance = 20.0, 75.0, 0.0, mean_irr

        eff = float(np.clip(model.predict([[day_idx, cloud, humidity, rainfall, irradiance]])[0], 0, 100))
        revenue = irradiance * PANEL_AREA_M2 * (eff / 100.0) * LSS_TARIFF_RM

        results.append({
            "date": f"Day {day_idx + 1}",
            "forecast_efficiency_pct": round(eff, 2),
            "forecast_revenue_rm": round(revenue, 2),
            "lower_bound": round(float(np.clip(eff - 1.5 * residual_std, 0, 100)), 2),
            "upper_bound": round(float(np.clip(eff + 1.5 * residual_std, 0, 100)), 2),
        })

    return results
