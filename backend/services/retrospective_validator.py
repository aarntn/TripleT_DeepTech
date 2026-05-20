import logging

import numpy as np
from sklearn.metrics import classification_report
from sklearn.metrics import confusion_matrix as sk_confusion_matrix

from services.dust_classifier import (
    FEATURES,
    _assign_3class_label,
    _fit_classifier,
)
from services.weather_provider import fetch_open_meteo_history

logger = logging.getLogger(__name__)

_retro_cache: dict | None = None

SELANGOR_LAT = 3.0738
SELANGOR_LON = 101.5183

# Tropical soiling accumulation model (tuned for Malaysia's humid climate)
# Light drizzle does not wash panels — only heavy downpours reset soiling
SOILING_RATE_PER_DRY_DAY = 0.30   # % efficiency drop per non-heavy-rain day
RAIN_THRESHOLD_MM = 15.0           # mm/day required to significantly clean panels
MAX_SOILING_LOSS_PCT = 20.0        # cap on cumulative soiling loss
BASE_EFFICIENCY_PCT = 95.0         # clean-panel baseline


def _apply_soiling_model(weather_rows: list[dict]) -> list[dict]:
    """Derive daily efficiency and soiling_loss from real weather using
    a dry-day accumulation model."""
    rows = []
    cumulative_soiling = 0.0

    for day in weather_rows:
        rainfall = day["rainfall_mm"]
        cloud = day["cloud_cover_pct"]
        irradiance = day["irradiance_kwh_m2"]
        humidity = day["humidity_pct"]

        if rainfall >= RAIN_THRESHOLD_MM:
            cumulative_soiling = 0.0
        else:
            cumulative_soiling = min(
                cumulative_soiling + SOILING_RATE_PER_DRY_DAY,
                MAX_SOILING_LOSS_PCT,
            )

        # High cloud cover lowers apparent efficiency independently of soiling
        weather_loss = max(0.0, (cloud - 30.0) * 0.08) if cloud > 30.0 else 0.0
        efficiency = max(20.0, BASE_EFFICIENCY_PCT - cumulative_soiling - weather_loss)
        dust_flag = 1 if cumulative_soiling > 3.0 else 0

        rows.append({
            "date": day["date"],
            "efficiency_pct": round(efficiency, 2),
            "irradiance_kwh_m2": irradiance,
            "cloud_cover_pct": cloud,
            "humidity_pct": humidity,
            "rainfall_mm": rainfall,
            "soiling_loss_pct": round(cumulative_soiling, 2),
            "dust_flag": dust_flag,
        })

    return rows


def run_retrospective_validation(
    start_date: str = "2024-01-01",
    end_date: str = "2024-12-31",
) -> dict:
    """Validate the classifier against real Open-Meteo historical weather data
    for Selangor, Malaysia.  The soiling accumulation model derives ground-truth
    labels from the same domain rules used in production classify(), giving an
    honest measure of how well the RF model generalises to real weather patterns.
    """
    global _retro_cache
    if _retro_cache is not None:
        return _retro_cache

    logger.info(
        "[Retrospective] fetching Open-Meteo history %s → %s", start_date, end_date
    )
    weather = fetch_open_meteo_history(
        lat=SELANGOR_LAT,
        lon=SELANGOR_LON,
        start_date=start_date,
        end_date=end_date,
    )
    if not weather:
        raise RuntimeError("No historical weather data returned from Open-Meteo.")

    daily = _apply_soiling_model(weather)

    X = np.array([[row[f] for f in FEATURES] for row in daily])
    y_true = np.array([
        _assign_3class_label(
            row["dust_flag"],
            row["cloud_cover_pct"],
            row["rainfall_mm"],
        )
        for row in daily
    ])

    # Train on synthetic CSV data as usual, then predict on real weather features
    clf, scaler, _ = _fit_classifier()
    X_scaled = scaler.transform(X)
    y_pred_binary = clf.predict(X_scaled)

    cloud_idx = FEATURES.index("cloud_cover_pct")
    rain_idx = FEATURES.index("rainfall_mm")
    y_pred = np.array([
        _assign_3class_label(int(p), float(X[i][cloud_idx]), float(X[i][rain_idx]))
        for i, p in enumerate(y_pred_binary)
    ])

    class_names = ["Dust", "Weather", "Normal"]
    cm = sk_confusion_matrix(y_true, y_pred, labels=[0, 1, 2]).tolist()
    report = classification_report(
        y_true,
        y_pred,
        labels=[0, 1, 2],
        target_names=class_names,
        output_dict=True,
        zero_division=0,
    )

    per_class = {
        name: {
            "precision": round(report[name]["precision"], 4),
            "recall": round(report[name]["recall"], 4),
            "f1": round(report[name]["f1-score"], 4),
            "support": int(report[name]["support"]),
        }
        for name in class_names
    }

    total_support = sum(v["support"] for v in per_class.values())
    weighted_f1 = round(
        sum(v["f1"] * v["support"] for v in per_class.values()) / max(total_support, 1),
        4,
    )

    _retro_cache = {
        "location": "Selangor, Malaysia",
        "latitude": SELANGOR_LAT,
        "longitude": SELANGOR_LON,
        "period_start": start_date,
        "period_end": end_date,
        "n_days": len(daily),
        "data_source": "Open-Meteo Historical Archive",
        "soiling_model": (
            f"Dry-day accumulation {SOILING_RATE_PER_DRY_DAY}%/day, "
            f"rain reset ≥{RAIN_THRESHOLD_MM} mm/day"
        ),
        "label_derivation": (
            "3-class labels derived from the same rule as prediction mapping "
            "(dust_flag → Dust; cloud>50% or rain>0 → Weather; else Normal). "
            "Weather/Normal split is deterministic — only Dust recall is independently modelled."
        ),
        "classes": class_names,
        "confusion_matrix": cm,
        "per_class": per_class,
        "macro_f1": round(report["macro avg"]["f1-score"], 4),
        "weighted_f1": weighted_f1,
        "accuracy": round(float(report["accuracy"]), 4),
    }
    return _retro_cache
