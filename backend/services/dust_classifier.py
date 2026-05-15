import logging
import os
from threading import Lock
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
_model_lock = Lock()


class ModelIntegrityError(RuntimeError):
    """Raised before deserializing an untrusted or tampered model file."""


class ModelUnavailableError(RuntimeError):
    """Raised when the classifier cannot be loaded or trained safely."""


class ClassifierInputError(ValueError):
    """Raised when prediction input is not safe for the classifier."""


def _model_load_mode() -> str:
    app_env = os.getenv("APP_ENV", "development").strip().lower() or "development"
    default_mode = "verified" if app_env == "production" else "train-fallback"
    mode = os.getenv("MODEL_LOAD_MODE", default_mode).strip().lower()
    if mode not in {"verified", "train-fallback"}:
        raise ModelIntegrityError("MODEL_LOAD_MODE must be 'verified' or 'train-fallback'.")
    if app_env == "production" and mode != "verified":
        raise ModelIntegrityError("MODEL_LOAD_MODE=verified is required when APP_ENV=production.")
    return mode


def _expected_hashes() -> tuple[str | None, str | None]:
    classifier_hash = os.getenv("DUST_CLASSIFIER_SHA256")
    scaler_hash = os.getenv("DUST_SCALER_SHA256")
    return (
        classifier_hash.strip().lower() if classifier_hash else None,
        scaler_hash.strip().lower() if scaler_hash else None,
    )


def validate_model_config() -> None:
    mode = _model_load_mode()
    classifier_hash, scaler_hash = _expected_hashes()
    if bool(classifier_hash) != bool(scaler_hash):
        raise ModelIntegrityError(
            "Both DUST_CLASSIFIER_SHA256 and DUST_SCALER_SHA256 must be configured together."
        )
    if mode == "verified" and not (classifier_hash and scaler_hash):
        raise ModelIntegrityError(
            "DUST_CLASSIFIER_SHA256 and DUST_SCALER_SHA256 are required for verified model loading."
        )


def _verify_model_file(path: Path, expected_hash: str, label: str) -> None:
    from core.security import sha256_file

    if not path.exists():
        raise FileNotFoundError(f"{label} model file is unavailable.")
    actual_hash = sha256_file(path).lower()
    if actual_hash != expected_hash:
        raise ModelIntegrityError(f"{label} model hash mismatch.")


def _fit_classifier() -> tuple[RandomForestClassifier, StandardScaler, float]:
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
    accuracy = float(clf.score(X_test_s, y_test))
    return clf, scaler, accuracy


def _load() -> tuple[RandomForestClassifier, StandardScaler]:
    global _classifier, _scaler
    if _classifier is not None and _scaler is not None:
        return _classifier, _scaler

    with _model_lock:
        if _classifier is not None and _scaler is not None:
            return _classifier, _scaler

        validate_model_config()
        classifier_hash, scaler_hash = _expected_hashes()
        if classifier_hash and scaler_hash:
            _verify_model_file(CLASSIFIER_PATH, classifier_hash, "classifier")
            _verify_model_file(SCALER_PATH, scaler_hash, "scaler")
            _classifier = joblib.load(CLASSIFIER_PATH)
            _scaler = joblib.load(SCALER_PATH)
            return _classifier, _scaler

        logger.warning("MODEL_LOAD_MODE=train-fallback; training classifier in memory from CSV data.")
        _classifier, _scaler, accuracy = _fit_classifier()
        logger.info("[DustClassifier] in_memory_accuracy=%.3f", accuracy)
    return _classifier, _scaler


def train_and_save() -> None:
    MODEL_DIR.mkdir(exist_ok=True)
    clf, scaler, accuracy = _fit_classifier()
    logger.info("[DustClassifier] accuracy=%.3f", accuracy)

    joblib.dump(clf, CLASSIFIER_PATH)
    joblib.dump(scaler, SCALER_PATH)

    global _classifier, _scaler
    _classifier = clf
    _scaler = scaler


def classify(reading: dict) -> dict:
    try:
        clf, scaler = _load()
    except (FileNotFoundError, ModelIntegrityError, OSError, ValueError) as exc:
        logger.exception("Classifier unavailable: %s", exc)
        raise ModelUnavailableError("Classifier unavailable.") from exc

    try:
        features = np.array([[reading[f] for f in FEATURES]], dtype=np.float64)
        if not np.isfinite(features).all():
            raise ClassifierInputError("Classifier input must contain only finite numeric values.")
        scaled = scaler.transform(features)
        pred = int(clf.predict(scaled)[0])
        proba = clf.predict_proba(scaled)[0]
    except (KeyError, TypeError, ValueError) as exc:
        raise ClassifierInputError("Classifier input is invalid.") from exc
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
