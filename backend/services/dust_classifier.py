import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parents[2] / "data" / "processed"
MODEL_DIR = Path(__file__).parents[1] / "models"
CLASSIFIER_PATH = MODEL_DIR / "dust_classifier.joblib"
SCALER_PATH = MODEL_DIR / "dust_scaler.joblib"

FEATURES = [
    "efficiency_pct",
    "irradiance_kwh_m2",
    "cloud_cover_pct",
    "humidity_pct",
    "rainfall_mm",
    "soiling_loss_pct",
]

_classifier: RandomForestClassifier | None = None
_scaler: StandardScaler | None = None


def _load() -> tuple[RandomForestClassifier, StandardScaler]:
    global _classifier, _scaler
    if _classifier is None:
        if not CLASSIFIER_PATH.exists():
            raise FileNotFoundError("Model not trained. Call train_and_save() first.")
        _classifier = joblib.load(CLASSIFIER_PATH)
        _scaler = joblib.load(SCALER_PATH)
    return _classifier, _scaler


def train_and_save() -> None:
    MODEL_DIR.mkdir(exist_ok=True)
    dusty = pd.read_csv(DATA_DIR / "scenario_dusty_week.csv")
    rainy = pd.read_csv(DATA_DIR / "scenario_rainy_week.csv")
    df = pd.concat([dusty, rainy], ignore_index=True)

    X = df[FEATURES].values
    y = df["dust_flag"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train_s, y_train)
    print(f"[DustClassifier] accuracy={clf.score(X_test_s, y_test):.3f}")

    joblib.dump(clf, CLASSIFIER_PATH)
    joblib.dump(scaler, SCALER_PATH)

    global _classifier, _scaler
    _classifier = clf
    _scaler = scaler


def classify(reading: dict) -> dict:
    try:
        clf, scaler = _load()
    except FileNotFoundError:
        logger.warning("Classifier not trained; returning safe default.")
        return {
            "type": "normal",
            "confidence": 0.0,
            "cause": "Panel output within expected range. No action required.",
        }

    features = np.array([[reading[f] for f in FEATURES]])
    scaled = scaler.transform(features)
    pred = int(clf.predict(scaled)[0])
    proba = clf.predict_proba(scaled)[0]
    confidence = float(proba[pred])

    if pred == 1:
        label = "dust"
        cause = (
            "Sustained efficiency drop without cloud cover — dust accumulation confirmed."
            if confidence > 0.85
            else "Likely dust — monitor for another 2 hours before triggering clean."
        )
    elif reading.get("cloud_cover_pct", 0) > 50 or reading.get("rainfall_mm", 0) > 0:
        label = "weather"
        cause = "Temporary output drop from cloud cover or rain — no cleaning needed."
    else:
        label = "normal"
        cause = "Panel output within expected range. No action required."

    return {"type": label, "confidence": confidence, "cause": cause}
