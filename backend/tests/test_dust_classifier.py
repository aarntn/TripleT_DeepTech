import pytest
from concurrent.futures import ThreadPoolExecutor

from core.security import sha256_file
from services.dust_classifier import (
    ClassifierInputError,
    ModelIntegrityError,
    ModelUnavailableError,
    classify,
    train_and_save,
    validate_model_config,
)

_DUST_READING = {
    "efficiency_pct": 65.0,
    "irradiance_kwh_m2": 3.5,
    "cloud_cover_pct": 15.0,
    "humidity_pct": 75.0,
    "rainfall_mm": 0.0,
    "soiling_loss_pct": 32.0,
}


@pytest.fixture(autouse=True)
def reset_classifier(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("MODEL_LOAD_MODE", "train-fallback")
    monkeypatch.delenv("DUST_CLASSIFIER_SHA256", raising=False)
    monkeypatch.delenv("DUST_SCALER_SHA256", raising=False)
    monkeypatch.setattr("services.dust_classifier._classifier", None)
    monkeypatch.setattr("services.dust_classifier._scaler", None)


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
    result = classify(_DUST_READING)
    assert set(result.keys()) == {"type", "confidence", "cause"}


def test_classify_type_is_valid():
    result = classify(_DUST_READING)
    assert result["type"] in {"dust", "weather", "normal"}


def test_classify_confidence_in_range():
    result = classify(_DUST_READING)
    assert 0.0 <= result["confidence"] <= 1.0


def test_classify_cause_is_nonempty_string():
    result = classify(_DUST_READING)
    assert isinstance(result["cause"], str) and len(result["cause"]) > 0


def test_valid_hashes_allow_joblib_load(tmp_path, monkeypatch):
    import services.dust_classifier as module

    classifier_path = tmp_path / "dust_classifier.joblib"
    scaler_path = tmp_path / "dust_scaler.joblib"
    monkeypatch.setattr(module, "MODEL_DIR", tmp_path)
    monkeypatch.setattr(module, "CLASSIFIER_PATH", classifier_path)
    monkeypatch.setattr(module, "SCALER_PATH", scaler_path)
    train_and_save()
    monkeypatch.setattr(module, "_classifier", None)
    monkeypatch.setattr(module, "_scaler", None)
    monkeypatch.setenv("DUST_CLASSIFIER_SHA256", sha256_file(classifier_path))
    monkeypatch.setenv("DUST_SCALER_SHA256", sha256_file(scaler_path))

    real_load = module.joblib.load
    loaded = []

    def spy_load(path):
        loaded.append(path.name)
        return real_load(path)

    monkeypatch.setattr(module.joblib, "load", spy_load)
    result = classify(_DUST_READING)

    assert result["type"] in {"dust", "weather", "normal"}
    assert set(loaded) == {"dust_classifier.joblib", "dust_scaler.joblib"}


def test_mismatched_hash_prevents_joblib_load(tmp_path, monkeypatch):
    import services.dust_classifier as module

    classifier_path = tmp_path / "dust_classifier.joblib"
    scaler_path = tmp_path / "dust_scaler.joblib"
    monkeypatch.setattr(module, "MODEL_DIR", tmp_path)
    monkeypatch.setattr(module, "CLASSIFIER_PATH", classifier_path)
    monkeypatch.setattr(module, "SCALER_PATH", scaler_path)
    train_and_save()
    monkeypatch.setattr(module, "_classifier", None)
    monkeypatch.setattr(module, "_scaler", None)
    monkeypatch.setenv("DUST_CLASSIFIER_SHA256", "0" * 64)
    monkeypatch.setenv("DUST_SCALER_SHA256", sha256_file(scaler_path))

    def fail_load(path):
        raise AssertionError("joblib.load should not be called after hash mismatch")

    monkeypatch.setattr(module.joblib, "load", fail_load)
    with pytest.raises(ModelUnavailableError):
        classify(_DUST_READING)


def test_absent_hashes_train_in_memory_without_joblib_load(monkeypatch):
    import services.dust_classifier as module

    monkeypatch.setattr("services.dust_classifier._classifier", None)
    monkeypatch.setattr("services.dust_classifier._scaler", None)

    def fail_load(path):
        raise AssertionError("joblib.load should not be called without configured hashes")

    monkeypatch.setattr(module.joblib, "load", fail_load)
    result = classify(_DUST_READING)
    assert result["type"] in {"dust", "weather", "normal"}


def test_production_model_config_requires_verified_hashes(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("MODEL_LOAD_MODE", raising=False)

    with pytest.raises(ModelIntegrityError):
        validate_model_config()


def test_classifier_rejects_non_finite_direct_input():
    reading = dict(_DUST_READING)
    reading["efficiency_pct"] = float("nan")

    with pytest.raises(ClassifierInputError):
        classify(reading)


def test_concurrent_fallback_training_runs_once(monkeypatch):
    import services.dust_classifier as module

    monkeypatch.setattr(module, "_classifier", None)
    monkeypatch.setattr(module, "_scaler", None)
    calls = 0
    real_fit = module._fit_classifier

    def counted_fit():
        nonlocal calls
        calls += 1
        return real_fit()

    monkeypatch.setattr(module, "_fit_classifier", counted_fit)

    with ThreadPoolExecutor(max_workers=50) as executor:
        results = list(executor.map(lambda _: classify(_DUST_READING), range(50)))

    assert len(results) == 50
    assert calls == 1
