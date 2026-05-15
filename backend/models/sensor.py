from pydantic import BaseModel, ConfigDict, Field, FiniteFloat


class ClassifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    array_id: str = Field(..., min_length=2, max_length=2, pattern=r"^[A-Z][0-9]$")
    efficiency_pct: FiniteFloat = Field(..., ge=0, le=100)
    irradiance_kwh_m2: FiniteFloat = Field(..., ge=0, le=20)
    cloud_cover_pct: FiniteFloat = Field(..., ge=0, le=100)
    humidity_pct: FiniteFloat = Field(..., ge=0, le=100)
    rainfall_mm: FiniteFloat = Field(..., ge=0, le=500)
    soiling_loss_pct: FiniteFloat = Field(..., ge=0, le=100)


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
