import math
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

PANEL_AREA_M2 = 2000
PEAK_IRRADIANCE = 4.5
NOISE_SIGMA = 0.005
ARRAYS = ["A1", "A2", "B1", "B2", "C1", "C2"]

# (start_efficiency_pct, end_efficiency_pct) over 7 days linear, except C1
DUSTY_ARRAY_EFF = {
    "A1": (97.0, 61.0),
    "A2": (94.0, 78.0),
    "B1": (96.0, 88.0),
    "B2": (91.0, 72.0),
    "C2": (98.0, 83.0),
}

RAINY_START_EFF = {
    "A1": 87.0, "A2": 89.0, "B1": 91.0,
    "B2": 85.0, "C1": 88.0, "C2": 90.0,
}
RAINY_POST_RAIN_EFF = {
    "A1": 93.0, "A2": 94.0, "B1": 96.0,
    "B2": 92.0, "C1": 95.0, "C2": 94.0,
}


def _irr_factor(hour: int) -> float:
    """Sin² bell curve: peak at 12:00, zero at 07:00 and >=17:00."""
    return max(0.0, math.sin(math.pi * (hour - 7) / 10) ** 2)


def _noisy(value: float) -> float:
    return float(np.clip(value + np.random.normal(0, NOISE_SIGMA * 100), 0.0, 100.0))


def _c1_eff(day_idx: int) -> float:
    """C1: partial wind-cleaning on day 4 (index 3), stable at 89% afterwards."""
    if day_idx < 3:
        return 95.0 - day_idx * 2.0
    return 89.0


def generate_dusty_week() -> pd.DataFrame:
    np.random.seed(42)
    rows = []
    start = datetime(2024, 7, 1, 7, 0)

    for day_idx in range(7):
        daily_var = np.random.uniform(0.8, 1.2)

        for array_id in ARRAYS:
            if array_id == "C1":
                eff_day = _c1_eff(day_idx)
            else:
                s, e = DUSTY_ARRAY_EFF[array_id]
                eff_day = s + (e - s) * day_idx / 6.0

            soiling = max(0.0, 97.0 - eff_day)

            for hour in range(7, 20):
                ts = start + timedelta(days=day_idx, hours=hour - 7)
                irr_f = _irr_factor(hour)
                irr = PEAK_IRRADIANCE * irr_f * daily_var
                eff = _noisy(eff_day)
                rows.append({
                    "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
                    "array_id": array_id,
                    "irradiance_kwh_m2": round(irr, 4),
                    "temp_c": round(np.random.uniform(27, 33) + (15.0 if irr_f > 0.5 else 0.0), 2),
                    "humidity_pct": round(np.random.uniform(70, 90), 2),
                    "cloud_cover_pct": round(np.random.uniform(5, 25), 2),
                    "rainfall_mm": 0.0,
                    "actual_output_kwh": round(irr * PANEL_AREA_M2 * eff / 100.0, 2),
                    "expected_output_kwh": round(irr * PANEL_AREA_M2 * 0.975, 2),
                    "efficiency_pct": round(eff, 4),
                    "soiling_loss_pct": round(soiling, 4),
                    "dust_flag": 1 if eff < 95.0 else 0,
                    "rain_event": False,
                })

    return pd.DataFrame(rows)


def generate_rainy_week() -> pd.DataFrame:
    np.random.seed(123)
    rows = []
    start = datetime(2024, 12, 1, 7, 0)
    # day 2 (index 1) = 18 mm heavy rain; day 5 (index 4) = 6 mm light rain
    rain_by_day = {1: 18.0, 4: 6.0}

    for day_idx in range(7):
        daily_var = np.random.uniform(0.8, 1.2)
        rain_mm = rain_by_day.get(day_idx, 0.0)
        is_rain = rain_mm > 0

        for array_id in ARRAYS:
            if day_idx == 0:
                eff_day = RAINY_START_EFF[array_id]
            elif day_idx == 1:
                # Rain day — efficiency slightly drops from cloud before recovery
                eff_day = RAINY_START_EFF[array_id] - float(np.random.uniform(1, 3))
            elif day_idx == 2:
                # Day after heavy rain — 80% of dust washed off
                eff_day = RAINY_POST_RAIN_EFF[array_id]
            elif day_idx <= 4:
                eff_day = RAINY_POST_RAIN_EFF[array_id] - (day_idx - 2) * 0.5
            else:
                eff_day = RAINY_POST_RAIN_EFF[array_id] - (day_idx - 2) * 0.8

            soiling = max(0.0, 97.0 - eff_day)

            for hour in range(7, 20):
                ts = start + timedelta(days=day_idx, hours=hour - 7)
                irr_f = _irr_factor(hour)

                if is_rain:
                    cloud_mod = np.random.uniform(0.4, 0.6) if 9 <= hour <= 16 else np.random.uniform(0.7, 0.9)
                    cloud_cover = float(np.random.uniform(60, 90))
                    humidity = float(np.random.uniform(90, 100))
                    hourly_rain = rain_mm / 13.0
                else:
                    cloud_mod = 1.0
                    cloud_cover = float(np.random.uniform(20, 50))
                    humidity = float(np.random.uniform(75, 90))
                    hourly_rain = 0.0

                irr = PEAK_IRRADIANCE * irr_f * daily_var * cloud_mod
                temp = float(np.random.uniform(24, 30)) + (10.0 if irr_f > 0.5 and not is_rain else 0.0)
                eff = _noisy(eff_day)

                rows.append({
                    "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
                    "array_id": array_id,
                    "irradiance_kwh_m2": round(irr, 4),
                    "temp_c": round(temp, 2),
                    "humidity_pct": round(humidity, 2),
                    "cloud_cover_pct": round(cloud_cover, 2),
                    "rainfall_mm": round(hourly_rain, 4),
                    "actual_output_kwh": round(irr * PANEL_AREA_M2 * eff / 100.0, 2),
                    "expected_output_kwh": round(irr * PANEL_AREA_M2 * 0.975, 2),
                    "efficiency_pct": round(eff, 4),
                    "soiling_loss_pct": round(soiling, 4),
                    "dust_flag": 1 if (eff < 95.0 and not is_rain) else 0,
                    "rain_event": is_rain,
                })

    return pd.DataFrame(rows)


def generate_forecast_input() -> pd.DataFrame:
    """Last 3 days of dusty week for A1 only, with appended forecast weather columns."""
    np.random.seed(99)
    dusty = generate_dusty_week()
    a1 = dusty[dusty["array_id"] == "A1"].sort_values("timestamp").tail(39).copy()
    n = len(a1)
    a1["forecast_cloud_cover_pct"] = np.random.uniform(15, 30, n).round(2)
    a1["forecast_rain_prob_pct"] = np.random.uniform(5, 20, n).round(2)
    a1["forecast_irradiance_kwh_m2"] = np.random.uniform(4.2, 4.8, n).round(4)
    return a1


if __name__ == "__main__":
    out = Path(__file__).parents[1] / "processed"
    out.mkdir(exist_ok=True)

    print("Generating dusty week...")
    df = generate_dusty_week()
    df.to_csv(out / "scenario_dusty_week.csv", index=False)
    print(f"  {len(df)} rows -> scenario_dusty_week.csv")

    print("Generating rainy week...")
    df = generate_rainy_week()
    df.to_csv(out / "scenario_rainy_week.csv", index=False)
    print(f"  {len(df)} rows -> scenario_rainy_week.csv")

    print("Generating forecast input...")
    df = generate_forecast_input()
    df.to_csv(out / "forecast_input.csv", index=False)
    print(f"  {len(df)} rows -> forecast_input.csv")

    print("Done.")
