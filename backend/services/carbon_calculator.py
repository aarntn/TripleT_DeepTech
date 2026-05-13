import os

GRID_EMISSION_FACTOR = 0.000585
CARBON_PRICE_RM = float(os.getenv("CARBON_PRICE_RM", "40"))


def tonnes_avoided(kwh_recovered: float) -> float:
    return kwh_recovered * GRID_EMISSION_FACTOR


def carbon_credit_rm(kwh_recovered: float) -> float:
    return tonnes_avoided(kwh_recovered) * CARBON_PRICE_RM
