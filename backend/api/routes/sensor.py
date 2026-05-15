from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

from models.sensor import ClassifyRequest, ClassifyResponse, ForecastPoint, SensorReading
from services.dust_classifier import classify
from services.forecaster import forecast as forecast_service

sensor_router = APIRouter()
forecast_router = APIRouter()

DATA_DIR = Path(__file__).parents[3] / "data" / "processed"
VALID_ARRAYS = {"A1", "A2", "B1", "B2", "C1", "C2"}


@sensor_router.post("/classify", response_model=ClassifyResponse)
def classify_reading(request: ClassifyRequest) -> ClassifyResponse:
    result = classify(request.model_dump(exclude={"array_id"}))
    return ClassifyResponse(**result)


@sensor_router.get("/latest", response_model=list[SensorReading])
def get_latest() -> list[SensorReading]:
    csv_path = DATA_DIR / "scenario_dusty_week.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=503, detail="Sensor data unavailable.")
    df = pd.read_csv(csv_path)
    latest = (
        df.sort_values("timestamp")
        .groupby("array_id", as_index=False)
        .last()
    )
    return [SensorReading(**row) for row in latest.to_dict(orient="records")]


@forecast_router.get("/{array_id}", response_model=list[ForecastPoint])
def get_forecast(array_id: str) -> list[ForecastPoint]:
    if array_id not in VALID_ARRAYS:
        raise HTTPException(status_code=404, detail=f"Array '{array_id}' not found.")
    return [ForecastPoint(**p) for p in forecast_service(array_id=array_id, days=3)]
