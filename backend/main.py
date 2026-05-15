import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import efficiency, market, roi
from api.routes.sensor import forecast_router, sensor_router

_CLASSIFIER_PATH = Path(__file__).parent / "models" / "dust_classifier.joblib"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not _CLASSIFIER_PATH.exists():
        from services.dust_classifier import train_and_save
        train_and_save()
    yield


app = FastAPI(
    title="SolarGuard API",
    description="ROI, efficiency, market, carbon, and sensor endpoints for SolarGuard.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(roi.router, prefix="/api/roi", tags=["ROI"])
app.include_router(efficiency.router, prefix="/api/efficiency", tags=["Efficiency"])
app.include_router(market.router, prefix="/api/market", tags=["Market"])
app.include_router(sensor_router, prefix="/api/sensor", tags=["Sensor"])
app.include_router(forecast_router, prefix="/api/forecast", tags=["Forecast"])


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "solarguard-api"}
