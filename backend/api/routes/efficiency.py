import logging
from typing import Literal

from fastapi import APIRouter, HTTPException

from services.degradation_model import get_monthly_efficiency

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{location}")
def get_efficiency(location: Literal["malaysia", "gcc"]) -> dict:
    try:
        rows = get_monthly_efficiency(location)
        return {
            "location": location,
            "monthly": [row.model_dump() for row in rows],
        }
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Unknown location: '{location}'.")
    except Exception as exc:
        logger.exception("Efficiency lookup failed: %s", exc)
        raise HTTPException(status_code=500, detail="Efficiency data error.") from exc
