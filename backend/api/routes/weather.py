import logging

from fastapi import APIRouter, HTTPException, Path

from core.security import sanitize_log_value
from models.weather import WeatherPoint
from services.weather_provider import get_weather_forecast

router = APIRouter()
logger = logging.getLogger(__name__)
VALID_ARRAYS = {"A1", "A2", "B1", "B2", "C1", "C2"}


@router.get("/forecast/{array_id}", response_model=list[WeatherPoint])
def get_forecast_weather(
    array_id: str = Path(..., min_length=2, max_length=2, pattern=r"^[A-Z][0-9]$")
) -> list[WeatherPoint]:
    if array_id not in VALID_ARRAYS:
        raise HTTPException(status_code=404, detail="Array not found.")
    try:
        rows = get_weather_forecast(array_id=array_id, days=3)
        return [WeatherPoint(**row) for row in rows]
    except Exception as exc:
        logger.exception("Weather forecast failed for array %s: %s", sanitize_log_value(array_id), exc)
        raise HTTPException(status_code=503, detail="Weather forecast unavailable.") from exc
