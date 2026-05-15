import pytest
from pathlib import Path

from services.dust_classifier import (
    classify,
    train_and_save,
    CLASSIFIER_PATH,
    SCALER_PATH,
)

_DUST_READING = {
    "efficiency_pct": 65.0,
    "irradiance_kwh_m2": 3.5,
    "cloud_cover_pct": 15.0,
    "humidity_pct": 75.0,
    "rainfall_mm": 0.0,
    "soiling_loss_pct": 32.0,
}


def test_train_and_save_creates_files(tmp_path, monkeypatch):
    monkeypatch.setattr("services.dust_classifier.MODEL_DIR", tmp_path)
    monkeypatch.setattr("services.dust_classifier.CLASSIFIER_PATH", tmp_path / "dust_classifier.joblib")
    monkeypatch.setattr("services.dust_classifier.SCALER_PATH", tmp_path / "dust_scaler.joblib")
    monkeypatch.setattr("services.dust_classifier._classifier", None)
    monkeypatch.setattr("services.dust_classifier._scaler", None)
    train_and_save()
    assert (tmp_path / "dust_classifier.joblib").exists()
    assert (tmp_path / "dust_scaler.joblib").exists()


def test_classify_returns_required_keys():
    train_and_save()
    result = classify(_DUST_READING)
    assert set(result.keys()) == {"type", "confidence", "cause"}


def test_classify_type_is_valid():
    train_and_save()
    result = classify(_DUST_READING)
    assert result["type"] in {"dust", "weather", "normal"}


def test_classify_confidence_in_range():
    train_and_save()
    result = classify(_DUST_READING)
    assert 0.0 <= result["confidence"] <= 1.0


def test_classify_cause_is_nonempty_string():
    train_and_save()
    result = classify(_DUST_READING)
    assert isinstance(result["cause"], str) and len(result["cause"]) > 0


def test_classify_safe_default_when_model_missing(tmp_path, monkeypatch):
    monkeypatch.setattr("services.dust_classifier._classifier", None)
    monkeypatch.setattr("services.dust_classifier._scaler", None)
    monkeypatch.setattr("services.dust_classifier.CLASSIFIER_PATH", tmp_path / "nonexistent.joblib")
    result = classify(_DUST_READING)
    assert result["type"] == "normal"
    assert result["confidence"] == 0.0
