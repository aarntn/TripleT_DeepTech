import logging

from fastapi import APIRouter, HTTPException

from services.degradation_model import LOCATIONS
from services.roi_calculator import HORMUZ_MULTIPLIER

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/locations")
def get_locations() -> dict:
    try:
        return {"locations": LOCATIONS}
    except Exception as exc:
        logger.exception("Market locations lookup failed: %s", exc)
        raise HTTPException(status_code=500, detail="Market data error.") from exc


@router.get("/hormuz")
def get_hormuz() -> dict[str, float | str]:
    return {
        "tariff_multiplier": HORMUZ_MULTIPLIER,
        "scenario": "Strait of Hormuz disruption sensitivity",
        "source_note": "Applies a 25% recovered-output tariff shock.",
    }
