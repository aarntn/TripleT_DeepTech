from typing import Literal

from fastapi import APIRouter

from services.degradation_model import get_monthly_efficiency

router = APIRouter()


@router.get("/{location}")
def get_efficiency(location: Literal["malaysia", "gcc"]) -> dict:
    rows = get_monthly_efficiency(location)
    return {
        "location": location,
        "monthly": [row.model_dump() for row in rows],
    }
