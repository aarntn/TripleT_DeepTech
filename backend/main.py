from contextlib import asynccontextmanager
from pathlib import Path

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


def load_local_env() -> None:
    """Load repo .env values for local runs without overriding real env vars."""
    import os

    if os.getenv("APP_ENV", "").strip().lower() == "test" or os.getenv("PYTEST_CURRENT_TEST"):
        return

    env_path = Path(__file__).parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    from services.dust_classifier import compute_performance
    from services.retrospective_validator import run_retrospective_validation

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, compute_performance)
    loop.run_in_executor(None, run_retrospective_validation)
    yield


def create_app() -> FastAPI:
    load_local_env()
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
