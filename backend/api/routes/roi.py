import logging

from fastapi import APIRouter, HTTPException

from models.farm import FarmRequest, ROIResponse
from services.roi_calculator import calculate_roi

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/calculate", response_model=ROIResponse)
def calculate(request: FarmRequest) -> ROIResponse:
    try:
        result = calculate_roi(
            mw=request.mw,
            location=request.location,
            tariff_rm_per_kwh=request.tariff_rm_per_kwh,
            hormuz=request.hormuz,
        )
        return ROIResponse.model_validate(result)
    except ZeroDivisionError:
        raise HTTPException(status_code=422, detail="Farm parameters produce zero net benefit — adjust MW or tariff.")
    except Exception as exc:
        logger.exception("ROI calculation failed: %s", exc)
        raise HTTPException(status_code=500, detail="ROI calculation error.") from exc
