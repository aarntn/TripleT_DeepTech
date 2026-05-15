import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[2] / "data" / "scripts"))
from generate_sensor_data import generate_dusty_week, generate_rainy_week, generate_forecast_input

EXPECTED_COLUMNS = [
    "timestamp", "array_id", "irradiance_kwh_m2", "temp_c", "humidity_pct",
    "cloud_cover_pct", "rainfall_mm", "actual_output_kwh", "expected_output_kwh",
    "efficiency_pct", "soiling_loss_pct", "dust_flag", "rain_event",
]


def test_dusty_week_row_count():
    df = generate_dusty_week()
    assert len(df) == 546  # 7 days × 6 arrays × 13 hours


def test_dusty_week_columns():
    df = generate_dusty_week()
    for col in EXPECTED_COLUMNS:
        assert col in df.columns, f"Missing column: {col}"


def test_dusty_week_all_six_arrays():
    df = generate_dusty_week()
    assert set(df["array_id"].unique()) == {"A1", "A2", "B1", "B2", "C1", "C2"}


def test_dusty_week_efficiency_in_bounds():
    df = generate_dusty_week()
    assert df["efficiency_pct"].between(0, 100).all()


def test_dusty_week_no_rain():
    df = generate_dusty_week()
    assert (df["rainfall_mm"] == 0.0).all()
    assert not df["rain_event"].any()


def test_dusty_week_a1_degrades_to_near_61():
    df = generate_dusty_week()
    a1 = df[df["array_id"] == "A1"]
    last_day_avg = a1.tail(13)["efficiency_pct"].mean()
    assert 55 < last_day_avg < 67  # noise band around 61%


def test_rainy_week_row_count():
    df = generate_rainy_week()
    assert len(df) == 546


def test_rainy_week_has_rain_events():
    df = generate_rainy_week()
    assert df["rain_event"].any()
    assert df["rainfall_mm"].sum() > 0


def test_rainy_week_dust_flag_zero_on_rain_days():
    df = generate_rainy_week()
    rain_rows = df[df["rain_event"]]
    assert (rain_rows["dust_flag"] == 0).all()


def test_forecast_input_only_a1():
    df = generate_forecast_input()
    assert set(df["array_id"].unique()) == {"A1"}


def test_forecast_input_row_count():
    df = generate_forecast_input()
    assert len(df) == 39  # 3 days × 13 hours


def test_forecast_input_has_forecast_columns():
    df = generate_forecast_input()
    for col in ["forecast_cloud_cover_pct", "forecast_rain_prob_pct", "forecast_irradiance_kwh_m2"]:
        assert col in df.columns, f"Missing column: {col}"
