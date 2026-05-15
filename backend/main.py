from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.trustedhost import TrustedHostMiddleware

from core.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from core.security import (
    AppSecurityMiddleware,
    SecurityConfig,
    SecurityHeadersMiddleware,
    env_bool,
)
from api.routes import efficiency, market, roi, weather
from api.routes.sensor import forecast_router, sensor_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    enable_docs = env_bool("ENABLE_API_DOCS", False)
    security_config = SecurityConfig.from_env()
    from services.dust_classifier import validate_model_config

    validate_model_config()

    app = FastAPI(
        title="SolarGuard API",
        description="ROI, efficiency, market, carbon, and sensor endpoints for SolarGuard.",
        version="0.2.0",
        lifespan=lifespan,
        docs_url="/docs" if enable_docs else None,
        redoc_url="/redoc" if enable_docs else None,
        openapi_url="/openapi.json" if enable_docs else None,
    )

    app.add_middleware(AppSecurityMiddleware, config=security_config)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=security_config.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=security_config.trusted_hosts)
    app.add_middleware(SecurityHeadersMiddleware, enable_hsts=security_config.enable_hsts)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    app.include_router(roi.router, prefix="/api/roi", tags=["ROI"])
    app.include_router(efficiency.router, prefix="/api/efficiency", tags=["Efficiency"])
    app.include_router(market.router, prefix="/api/market", tags=["Market"])
    app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
    app.include_router(sensor_router, prefix="/api/sensor", tags=["Sensor"])
    app.include_router(forecast_router, prefix="/api/forecast", tags=["Forecast"])

    @app.get("/")
    def health_check() -> dict[str, str]:
        return {"status": "ok", "service": "solarguard-api"}

    return app


app = create_app()
