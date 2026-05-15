from pydantic import BaseModel


class WeatherPoint(BaseModel):
    timestamp: str
    array_id: str
    irradiance_kwh_m2: float
    temp_c: float
    humidity_pct: float
    cloud_cover_pct: float
    rainfall_mm: float
    source: str
