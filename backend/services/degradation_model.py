from typing import Literal

from pydantic import BaseModel

MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]

LOCATIONS = {
    "malaysia": {
        "label": "Malaysia",
        "irradiance": 4.5,
        "base_tariff": 0.35,
        "water_self_supply": 0.72,
        "dust_profile": "humid tropical",
    },
    "gcc": {
        "label": "GCC desert",
        "irradiance": 5.8,
        "base_tariff": 0.42,
        "water_self_supply": 0.18,
        "dust_profile": "arid high dust",
    },
}

EFFICIENCY_PROFILES = {
    "malaysia": {
        "eff_with": [97, 94, 97, 94, 97, 94, 97, 94, 97, 94, 97, 94],
        "eff_without": [98, 95.5, 93, 90.5, 88, 85.5, 83, 80.5, 78, 75.5, 73, 70.5],
    },
    "gcc": {
        "eff_with": [96, 88, 96, 88, 96, 88, 96, 88, 96, 88, 96, 88],
        "eff_without": [98, 91, 84, 77, 70, 65, 65, 65, 65, 65, 65, 65],
    },
}


class EfficiencyRecord(BaseModel):
    month: str
    eff_with: float
    eff_without: float


def get_monthly_efficiency(location: Literal["malaysia", "gcc"]) -> list[EfficiencyRecord]:
    profile = EFFICIENCY_PROFILES[location]
    return [
        EfficiencyRecord(
            month=month,
            eff_with=profile["eff_with"][index],
            eff_without=profile["eff_without"][index],
        )
        for index, month in enumerate(MONTHS)
    ]
