from dataclasses import dataclass
from typing import Literal

from services.carbon_calculator import carbon_credit_rm
from services.degradation_model import LOCATIONS, get_monthly_efficiency

SYSTEM_COST_PER_MW = 120_000
ANNUAL_OM_PER_MW = 15_000
DISCOUNT_RATE = 0.10
PROJECT_LIFE_YEARS = 7
HORMUZ_MULTIPLIER = 1.25


@dataclass
class MonthlyRecord:
    month: str
    eff_with: float
    eff_without: float
    kwh_recovered: int
    rm_recovered: int
    carbon_value_rm: int


@dataclass
class ROIResult:
    annual_kwh_recovered: int
    annual_revenue_rm: int
    annual_carbon_rm: int
    system_cost_rm: int
    annual_om_rm: int
    annual_net_rm: int
    payback_years: float
    npv_rm: int
    monthly: list[MonthlyRecord]
    cumulative: list[dict]


def calculate_roi(
    mw: float,
    location: Literal["malaysia", "gcc"],
    tariff_rm_per_kwh: float,
    hormuz: bool = False,
) -> ROIResult:
    effective_tariff = tariff_rm_per_kwh * (HORMUZ_MULTIPLIER if hormuz else 1.0)
    irradiance = LOCATIONS[location]["irradiance"]
    monthly_kwh_per_mw = irradiance * 1_000 * 365 / 12

    monthly_records: list[MonthlyRecord] = []

    for row in get_monthly_efficiency(location):
        kwh_with = monthly_kwh_per_mw * mw * (row.eff_with / 100)
        kwh_without = monthly_kwh_per_mw * mw * (row.eff_without / 100)
        kwh_recovered = kwh_with - kwh_without

        monthly_records.append(
            MonthlyRecord(
                month=row.month,
                eff_with=row.eff_with,
                eff_without=row.eff_without,
                kwh_recovered=round(kwh_recovered),
                rm_recovered=round(kwh_recovered * effective_tariff),
                carbon_value_rm=round(carbon_credit_rm(kwh_recovered)),
            )
        )

    annual_kwh = sum(row.kwh_recovered for row in monthly_records)
    annual_revenue = sum(row.rm_recovered for row in monthly_records)
    annual_carbon = sum(row.carbon_value_rm for row in monthly_records)

    system_cost = round(mw * SYSTEM_COST_PER_MW)
    annual_om = round(mw * ANNUAL_OM_PER_MW)
    annual_net = annual_revenue - annual_om
    payback = system_cost / max(annual_net, 1)

    annuity_factor = (1 - (1 + DISCOUNT_RATE) ** (-PROJECT_LIFE_YEARS)) / DISCOUNT_RATE
    npv = round(annual_net * annuity_factor - system_cost)

    cumulative = [
        {
            "year": f"Yr {year}",
            "system_cost_k": round(system_cost / 1_000),
            "cum_savings_k": 0 if year == 0 else round(annual_net * year / 1_000),
        }
        for year in range(6)
    ]

    return ROIResult(
        annual_kwh_recovered=annual_kwh,
        annual_revenue_rm=annual_revenue,
        annual_carbon_rm=annual_carbon,
        system_cost_rm=system_cost,
        annual_om_rm=annual_om,
        annual_net_rm=annual_net,
        payback_years=round(payback, 2),
        npv_rm=npv,
        monthly=monthly_records,
        cumulative=cumulative,
    )
