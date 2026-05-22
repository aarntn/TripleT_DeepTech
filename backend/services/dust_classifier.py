import logging
import os
from threading import Lock
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.metrics import confusion_matrix as sk_confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"
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


def _assign_3class_label(dust_flag: int, cloud_cover_pct: float, rainfall_mm: float) -> int:
    """Map binary dust_flag + weather features to 0=Dust, 1=Weather, 2=Normal."""
    if dust_flag == 1:
        return 0
    if cloud_cover_pct > 50 or rainfall_mm > 0:
        return 1
    return 2


# Public aliases for use by retrospective_validator — callers should not access
# the private underscore names directly.
assign_3class_label = _assign_3class_label
fit_classifier = _fit_classifier

_performance_cache: dict | None = None


def compute_performance() -> dict:
    """Run a held-out evaluation of the classifier and return per-class metrics."""
    global _performance_cache
    if _performance_cache is not None:
        return _performance_cache

    dusty = pd.read_csv(DATA_DIR / "scenario_dusty_week.csv")
    rainy = pd.read_csv(DATA_DIR / "scenario_rainy_week.csv")
    df = pd.concat([dusty, rainy], ignore_index=True).reset_index(drop=True)

    X = df[FEATURES].values
    y_binary = df["dust_flag"].values
    y_3class = np.array([
        _assign_3class_label(
            int(row["dust_flag"]),
            float(row["cloud_cover_pct"]),
            float(row["rainfall_mm"]),
        )
        for _, row in df.iterrows()
    ])

    # RF is trained on binary labels; 3-class split used only for evaluation
    X_train, X_test, y_train_bin, _, _, y_test_3c = train_test_split(
        X, y_binary, y_3class, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train_s, y_train_bin)

    cloud_idx = FEATURES.index("cloud_cover_pct")
    rain_idx = FEATURES.index("rainfall_mm")
    y_pred_binary = clf.predict(X_test_s)
    y_pred_3class = np.array([
        _assign_3class_label(int(p), float(X_test[i][cloud_idx]), float(X_test[i][rain_idx]))
        for i, p in enumerate(y_pred_binary)
    ])

    class_names = ["Dust", "Weather", "Normal"]
    cm = sk_confusion_matrix(y_test_3c, y_pred_3class, labels=[0, 1, 2]).tolist()
    report = classification_report(
        y_test_3c, y_pred_3class,
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
    macro_f1 = round(report["macro avg"]["f1-score"], 4)
    weighted_f1 = round(report["weighted avg"]["f1-score"], 4)
    accuracy = round(float(report["accuracy"]), 4)

    _performance_cache = {
        "classes": class_names,
        "confusion_matrix": cm,
        "per_class": per_class,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "accuracy": accuracy,
        "test_set_size": len(y_test_3c),
        "train_set_size": len(X_train),
        "model_type": "RandomForestClassifier (100 estimators)",
        "features": list(FEATURES),
        "source": "held-out test split (random_state=42, test_size=0.2)",
    }
    return _performance_cache


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
