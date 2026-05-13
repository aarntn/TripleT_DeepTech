from fastapi import APIRouter

from services.degradation_model import LOCATIONS
from services.roi_calculator import HORMUZ_MULTIPLIER

router = APIRouter()


@router.get("/locations")
def get_locations() -> dict:
    return {"locations": LOCATIONS}


@router.get("/hormuz")
def get_hormuz() -> dict[str, float | str]:
    return {
        "tariff_multiplier": HORMUZ_MULTIPLIER,
        "scenario": "Strait of Hormuz disruption sensitivity",
        "source_note": "Applies a 25% recovered-output tariff shock.",
    }
