from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FarmRequest(BaseModel):
    mw: float = Field(..., gt=0, le=50, description="Installed farm capacity in MW")
    location: Literal["malaysia", "gcc"]
    tariff_rm_per_kwh: float = Field(..., gt=0, le=2)
    hormuz: bool = False


class EfficiencyRow(BaseModel):
    month: str
    eff_with: float
    eff_without: float


class MonthlyRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    month: str
    eff_with: float
    eff_without: float
    kwh_recovered: int
    rm_recovered: int
    carbon_value_rm: int


class CumulativeRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    year: str
    system_cost_k: int
    cum_savings_k: int


class ROIResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    annual_kwh_recovered: int
    annual_revenue_rm: int
    annual_carbon_rm: int
    system_cost_rm: int
    annual_om_rm: int
    annual_net_rm: int
    payback_years: float
    npv_rm: int
    monthly: list[MonthlyRow]
    cumulative: list[CumulativeRow]
