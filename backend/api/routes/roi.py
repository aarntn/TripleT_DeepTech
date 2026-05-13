from fastapi import APIRouter

from models.farm import FarmRequest, ROIResponse
from services.roi_calculator import calculate_roi

router = APIRouter()


@router.post("/calculate", response_model=ROIResponse)
def calculate(request: FarmRequest) -> ROIResponse:
    result = calculate_roi(
        mw=request.mw,
        location=request.location,
        tariff_rm_per_kwh=request.tariff_rm_per_kwh,
        hormuz=request.hormuz,
    )
    return ROIResponse.model_validate(result)
