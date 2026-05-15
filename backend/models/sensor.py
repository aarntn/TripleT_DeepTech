from pydantic import BaseModel, ConfigDict, Field


class ClassifyRequest(BaseModel):
    array_id: str
    efficiency_pct: float = Field(..., ge=0, le=100)
    irradiance_kwh_m2: float = Field(..., ge=0)
    cloud_cover_pct: float = Field(..., ge=0, le=100)
    humidity_pct: float = Field(..., ge=0, le=100)
    rainfall_mm: float = Field(..., ge=0)
    soiling_loss_pct: float = Field(..., ge=0)


class ClassifyResponse(BaseModel):
    type: str
    confidence: float
    cause: str


class SensorReading(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    array_id: str
    timestamp: str
    irradiance_kwh_m2: float
    temp_c: float
    humidity_pct: float
    cloud_cover_pct: float
    rainfall_mm: float
    actual_output_kwh: float
    expected_output_kwh: float
    efficiency_pct: float
    soiling_loss_pct: float
    dust_flag: int
    rain_event: bool


class ForecastPoint(BaseModel):
    date: str
    forecast_efficiency_pct: float
    forecast_revenue_rm: float
    lower_bound: float
    upper_bound: float
