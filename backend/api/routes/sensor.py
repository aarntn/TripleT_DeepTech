import logging
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException, Path as PathParam

from core.security import sanitize_log_value
from models.sensor import ClassifyRequest, ClassifyResponse, ClassifierPerformanceResponse, ForecastPoint, RetrospectiveValidationResponse, SensorReading
from services.dust_classifier import ClassifierInputError, ModelUnavailableError, classify, compute_performance
from services.retrospective_validator import run_retrospective_validation
from services.forecaster import forecast as forecast_service

sensor_router = APIRouter()
forecast_router = APIRouter()
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parents[2] / "data"
VALID_ARRAYS = {"A1", "A2", "B1", "B2", "C1", "C2"}


@sensor_router.get("/classifier/performance", response_model=ClassifierPerformanceResponse)
def get_classifier_performance() -> ClassifierPerformanceResponse:
    try:
        result = compute_performance()
        return ClassifierPerformanceResponse(**result)
    except FileNotFoundError as exc:
        logger.exception("Classifier performance data unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Sensor data unavailable.") from exc
    except Exception as exc:
        logger.exception("Classifier performance computation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Classifier performance error.") from exc


@sensor_router.get("/classifier/retrospective", response_model=RetrospectiveValidationResponse)
def get_retrospective_validation() -> RetrospectiveValidationResponse:
    try:
        result = run_retrospective_validation()
        return RetrospectiveValidationResponse(**result)
    except (RuntimeError, OSError) as exc:
        logger.exception("Retrospective validation failed: %s", exc)
        raise HTTPException(status_code=503, detail="Historical weather data unavailable.") from exc
    except Exception as exc:
        logger.exception("Retrospective validation error: %s", exc)
        raise HTTPException(status_code=500, detail="Retrospective validation error.") from exc


@sensor_router.post("/classify", response_model=ClassifyResponse)
def classify_reading(request: ClassifyRequest) -> ClassifyResponse:
    try:
        result = classify(request.model_dump(exclude={"array_id"}))
        return ClassifyResponse(**result)
    except ClassifierInputError as exc:
        raise HTTPException(status_code=422, detail="Classifier input is invalid.") from exc
    except ModelUnavailableError as exc:
        logger.exception("Classifier unavailable for array %s", sanitize_log_value(request.array_id))
        raise HTTPException(status_code=503, detail="Classifier unavailable.") from exc
    except Exception as exc:
        logger.exception(
            "Classifier failed for array %s: %s",
            sanitize_log_value(request.array_id),
            exc,
        )
        raise HTTPException(status_code=500, detail="Classification error.") from exc


@sensor_router.get("/latest", response_model=list[SensorReading])
def get_latest() -> list[SensorReading]:
    csv_path = DATA_DIR / "scenario_dusty_week.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=503, detail="Sensor data unavailable.")
    try:
        df = pd.read_csv(csv_path)
        latest = (
            df.sort_values("timestamp")
            .groupby("array_id", as_index=False)
            .last()
        )
        return [SensorReading(**row) for row in latest.to_dict(orient="records")]
    except Exception as exc:
        logger.exception("Failed to read sensor data: %s", exc)
        raise HTTPException(status_code=500, detail="Sensor data read error.") from exc


@sensor_router.get("/history", response_model=list[SensorReading])
def get_history() -> list[SensorReading]:
    csv_path = DATA_DIR / "scenario_dusty_week.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=503, detail="Sensor history unavailable.")
    try:
        df = pd.read_csv(csv_path).sort_values(["array_id", "timestamp"])
        return [SensorReading(**row) for row in df.to_dict(orient="records")]
    except Exception as exc:
        logger.exception("Failed to read sensor history: %s", exc)
        raise HTTPException(status_code=500, detail="Sensor history read error.") from exc


@forecast_router.get("/{array_id}", response_model=list[ForecastPoint])
def get_forecast(
    array_id: str = PathParam(..., min_length=2, max_length=2, pattern=r"^[A-Z][0-9]$")
) -> list[ForecastPoint]:
    if array_id not in VALID_ARRAYS:
        raise HTTPException(status_code=404, detail="Array not found.")
    try:
        return [ForecastPoint(**p) for p in forecast_service(array_id=array_id, days=3)]
    except Exception as exc:
        logger.exception("Forecast failed for array %s: %s", sanitize_log_value(array_id), exc)
        raise HTTPException(status_code=500, detail="Forecast error.") from exc
