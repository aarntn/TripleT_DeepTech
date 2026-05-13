import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import efficiency, market, roi

app = FastAPI(
    title="SolarGuard API",
    description="ROI, efficiency, market, and carbon endpoints for SolarGuard.",
    version="0.1.0",
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


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "solarguard-api"}
