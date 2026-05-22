import logging
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from core.security import sanitize_log_value
from services.roi_calculator import DEFAULT_TARIFF_RM_PER_KWH
from services.weather_provider import get_weather_forecast

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"
# Rated capacity of each monitored array block.  Used as kWp so that
# revenue = irradiance (peak-sun-hours) × kWp × efficiency × tariff → RM/day.
ARRAY_RATED_KWP = 2000
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


def _daily_weather_rows(rows: list[dict], mean_irr: float, legacy_forecast: bool = False):
    if not rows:
        return None
    df = pd.DataFrame(rows)
    if df.empty or "timestamp" not in df.columns:
        return None

    df["_date"] = pd.to_datetime(df["timestamp"]).dt.date
    if legacy_forecast:
        return (
            df.groupby("_date")
            .agg(
                cloud_cover_pct=("forecast_cloud_cover_pct", "mean"),
                humidity_pct=("humidity_pct", "mean"),
                rainfall_mm=("rainfall_mm", "sum"),
                irradiance_kwh_m2=("forecast_irradiance_kwh_m2", "first"),
            )
            .reset_index(drop=True)
        )

    daily = (
        df.groupby("_date")
        .agg(
            cloud_cover_pct=("cloud_cover_pct", "mean"),
            humidity_pct=("humidity_pct", "mean"),
            rainfall_mm=("rainfall_mm", "sum"),
            irradiance_kwh_m2=("irradiance_kwh_m2", "sum"),
        )
        .reset_index(drop=True)
    )
    daily["irradiance_kwh_m2"] = daily["irradiance_kwh_m2"].apply(
        lambda value: mean_irr if float(value) <= 0 else float(value)
    )
    return daily


def _forecast_weather_rows(array_id: str, days: int, mean_irr: float):
    weather_rows = get_weather_forecast(
        array_id=array_id,
        days=days,
        fallback_irradiance_kwh_m2=0.0,
    )
    if weather_rows:
        daily = _daily_weather_rows(weather_rows, mean_irr=mean_irr)
        if daily is not None and not daily.empty:
            return daily

    fc_csv = DATA_DIR / "forecast_input.csv"
    if fc_csv.exists() and array_id == "A1":
        fc_df = pd.read_csv(fc_csv)
        daily = _daily_weather_rows(
            fc_df.to_dict(orient="records"),
            mean_irr=mean_irr,
            legacy_forecast=True,
        )
        if daily is not None and not daily.empty:
            return daily

    return None


def forecast(array_id: str, days: int = 3) -> list[dict]:
    csv_path = DATA_DIR / "scenario_dusty_week.csv"
    if not csv_path.exists() or array_id not in VALID_ARRAYS:
        logger.warning(
            "Forecast data unavailable for %s; returning safe default.",
            sanitize_log_value(array_id),
        )
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
    residual_std = float(np.std(residuals))

    # Realistic uncertainty floor: tropical day-ahead solar GHI forecast RMSE is
    # typically 10–15% of mean irradiance, propagating to ~3–5% efficiency uncertainty
    # (1σ). Synthetic training residuals are near-zero by design, so we enforce a floor.
    # Uncertainty also grows with horizon — each additional day is less predictable.
    MIN_FORECAST_STD = 3.5        # % efficiency points, 1-sigma floor (tropical Malaysia)
    HORIZON_SCALE = [1.0, 1.35, 1.70]  # Day+1, Day+2, Day+3 scaling

    last_day = int(daily["day_idx"].max())
    mean_irr = float(daily["irradiance_kwh_m2"].mean())
    fc_rows = _forecast_weather_rows(array_id=array_id, days=days, mean_irr=mean_irr)
    results = []

    for i in range(days):
        day_idx = last_day + 1 + i
        if fc_rows is not None and i < len(fc_rows):
            row = fc_rows.iloc[i]
            cloud = float(row.get("cloud_cover_pct", 20.0))
            humidity = float(row.get("humidity_pct", 75.0))
            rainfall = float(row.get("rainfall_mm", 0.0))
            irradiance = float(row.get("irradiance_kwh_m2", mean_irr))
        else:
            cloud, humidity, rainfall, irradiance = 20.0, 75.0, 0.0, mean_irr

        eff = float(np.clip(model.predict([[day_idx, cloud, humidity, rainfall, irradiance]])[0], 0, 100))
        revenue = irradiance * ARRAY_RATED_KWP * (eff / 100.0) * DEFAULT_TARIFF_RM_PER_KWH

        horizon_std = max(residual_std, MIN_FORECAST_STD) * HORIZON_SCALE[min(i, len(HORIZON_SCALE) - 1)]
        results.append({
            "date": f"Day {day_idx + 1}",
            "forecast_efficiency_pct": round(eff, 2),
            "forecast_revenue_rm": round(revenue, 2),
            "lower_bound": round(float(np.clip(eff - 1.5 * horizon_std, 0, 100)), 2),
            "upper_bound": round(float(np.clip(eff + 1.5 * horizon_std, 0, 100)), 2),
        })

    return results
