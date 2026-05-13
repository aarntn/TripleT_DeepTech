"""
Generate synthetic monthly panel efficiency and revenue datasets for SolarGuard.

Usage:
    python generate_dataset.py --location malaysia --mw 5 --output ../processed/
    python generate_dataset.py --location gcc --mw 10 --output ../processed/
    python generate_dataset.py --all --output ../processed/
"""

import argparse
import csv
import os
from datetime import datetime
from pathlib import Path

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
        "irradiance": 4.5,
        "tariff": 0.35,
        "eff_with": [97, 94, 97, 94, 97, 94, 97, 94, 97, 94, 97, 94],
        "eff_without": [98, 95.5, 93, 90.5, 88, 85.5, 83, 80.5, 78, 75.5, 73, 70.5],
    },
    "gcc": {
        "irradiance": 5.8,
        "tariff": 0.42,
        "eff_with": [96, 88, 96, 88, 96, 88, 96, 88, 96, 88, 96, 88],
        "eff_without": [98, 91, 84, 77, 70, 65, 65, 65, 65, 65, 65, 65],
    },
}

SYSTEM_COST_PER_MW = 120_000
ANNUAL_OM_PER_MW = 15_000
CARBON_PRICE = 40.0
GRID_EMISSION_FACTOR = 0.000585
DISCOUNT_RATE = 0.10
PROJECT_LIFE_YEARS = 7


def generate(location: str, mw: float) -> list[dict]:
    loc = LOCATIONS[location]
    monthly_kwh_per_mw = loc["irradiance"] * 1_000 * 365 / 12

    rows = []
    for index, month in enumerate(MONTHS):
        eff_with = loc["eff_with"][index]
        eff_without = loc["eff_without"][index]
        kwh_with = monthly_kwh_per_mw * mw * (eff_with / 100)
        kwh_without = monthly_kwh_per_mw * mw * (eff_without / 100)
        kwh_recovered = kwh_with - kwh_without
        rows.append(
            {
                "location": location,
                "farm_mw": mw,
                "month": month,
                "eff_with_cleaning_pct": round(eff_with, 1),
                "eff_without_cleaning_pct": round(eff_without, 1),
                "efficiency_recovered_pct": round(eff_with - eff_without, 1),
                "kwh_recovered": round(kwh_recovered),
                "rm_recovered": round(kwh_recovered * loc["tariff"]),
                "carbon_tonnes_avoided": round(kwh_recovered * GRID_EMISSION_FACTOR, 3),
                "carbon_value_rm": round(kwh_recovered * GRID_EMISSION_FACTOR * CARBON_PRICE),
            }
        )
    return rows


def write_csv(rows: list[dict], path: str) -> None:
    if not rows:
        return

    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Wrote {len(rows)} rows -> {path}")


def summary(rows: list[dict], location: str, mw: float) -> None:
    annual_kwh = sum(row["kwh_recovered"] for row in rows)
    annual_revenue = sum(row["rm_recovered"] for row in rows)
    annual_carbon = sum(row["carbon_value_rm"] for row in rows)
    system_cost = mw * SYSTEM_COST_PER_MW
    annual_om = mw * ANNUAL_OM_PER_MW
    annual_net = annual_revenue - annual_om
    payback = system_cost / max(annual_net, 1)
    annuity_factor = (1 - (1 + DISCOUNT_RATE) ** (-PROJECT_LIFE_YEARS)) / DISCOUNT_RATE
    npv = annual_net * annuity_factor - system_cost

    print(f"\n  Summary - {mw} MW, {location.upper()}")
    print(f"  Annual kWh recovered : {annual_kwh:,.0f} kWh")
    print(f"  Annual revenue       : RM {annual_revenue:,.0f}")
    print(f"  Annual carbon value  : RM {annual_carbon:,.0f}")
    print(f"  System cost          : RM {system_cost:,.0f}")
    print(f"  Annual net benefit   : RM {annual_net:,.0f}")
    print(f"  Payback period       : {payback:.1f} years")
    print(f"  {PROJECT_LIFE_YEARS}-year NPV          : RM {npv:,.0f}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate SolarGuard synthetic dataset")
    parser.add_argument("--location", choices=["malaysia", "gcc"], help="Market location")
    parser.add_argument("--mw", type=float, default=5.0, help="Farm size in MW")
    parser.add_argument("--output", default="../processed/", help="Output directory")
    parser.add_argument("--all", action="store_true", help="Generate all location x MW combos")
    args = parser.parse_args()

    if not args.all and args.location is None:
        parser.error("--location is required unless --all is used")

    combos = (
        [("malaysia", mw) for mw in [1, 5, 10, 20, 50]]
        + [("gcc", mw) for mw in [1, 5, 10, 20, 50]]
        if args.all
        else [(args.location, args.mw)]
    )

    print(f"\nSolarGuard Dataset Generator - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    for location, mw in combos:
        rows = generate(location, mw)
        filename = f"efficiency_{location}_{int(mw)}mw.csv"
        write_csv(rows, os.path.join(args.output, filename))
        summary(rows, location, mw)

    print("\nDone.\n")


if __name__ == "__main__":
    main()
