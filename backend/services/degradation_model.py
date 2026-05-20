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
        "base_tariff": 0.39,
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

# Malaysia: humid tropical, two monsoon seasons (NE: Nov–Jan, SW: May–Sep).
# Without cleaning, dust accumulates through dry spells (Feb–Apr, Jul–Sep) and
# resets partially with heavy monsoon rain. eff_with reflects AI-scheduled monthly
# cleaning that keeps efficiency near baseline.  Source: Sulaiman 2018 Perak field
# study (PVSC) adapted with Open-Meteo 2024 Selangor rainfall calendar.
#
# GCC: arid desert, soiling ~0.5 %/day; only winter rain (Dec–Feb) provides natural
# reset. eff_with requires aggressive cleaning to hold near baseline.
EFFICIENCY_PROFILES = {
    "malaysia": {
        "eff_with":    [97.5, 96.0, 95.5, 96.0, 96.5, 96.0, 95.5, 95.5, 96.0, 96.5, 97.0, 97.5],
        "eff_without": [97.0, 93.5, 90.0, 88.5, 87.5, 86.0, 83.5, 82.0, 81.5, 84.0, 88.5, 94.5],
    },
    "gcc": {
        "eff_with":    [96.0, 95.5, 95.0, 95.0, 94.5, 94.5, 94.5, 94.5, 95.0, 95.5, 96.0, 96.0],
        "eff_without": [95.5, 87.0, 78.0, 69.5, 62.0, 60.0, 60.0, 60.0, 62.5, 66.0, 74.0, 87.5],
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
