import pytest

from services.roi_calculator import calculate_roi


@pytest.mark.parametrize("location,mw,hormuz", [
    ("malaysia", 5, False),
    ("gcc", 10, False),
    ("malaysia", 5, True),
    ("gcc", 1, True),
])
def test_payback_positive_and_bounded(location, mw, hormuz):
    result = calculate_roi(mw=mw, location=location, tariff_rm_per_kwh=0.39, hormuz=hormuz)
    assert 0 < result.payback_years < 15


def test_monthly_count_is_twelve():
    result = calculate_roi(mw=1, location="malaysia", tariff_rm_per_kwh=0.39)
    assert len(result.monthly) == 12


def test_cumulative_covers_full_project_life():
    from services.roi_calculator import PROJECT_LIFE_YEARS
    result = calculate_roi(mw=1, location="malaysia", tariff_rm_per_kwh=0.39)
    assert len(result.cumulative) == PROJECT_LIFE_YEARS + 1


def test_hormuz_increases_annual_revenue():
    base = calculate_roi(mw=5, location="malaysia", tariff_rm_per_kwh=0.39, hormuz=False)
    with_hormuz = calculate_roi(mw=5, location="malaysia", tariff_rm_per_kwh=0.39, hormuz=True)
    assert with_hormuz.annual_revenue_rm > base.annual_revenue_rm


def test_annual_net_positive():
    result = calculate_roi(mw=5, location="malaysia", tariff_rm_per_kwh=0.39)
    assert result.annual_net_rm > 0


def test_payback_scales_linearly_with_mw():
    small = calculate_roi(mw=1, location="malaysia", tariff_rm_per_kwh=0.39)
    large = calculate_roi(mw=50, location="malaysia", tariff_rm_per_kwh=0.39)
    assert abs(small.payback_years - large.payback_years) < 0.5


def test_gcc_higher_revenue_than_malaysia_same_mw():
    my = calculate_roi(mw=10, location="malaysia", tariff_rm_per_kwh=0.42)
    gcc = calculate_roi(mw=10, location="gcc", tariff_rm_per_kwh=0.42)
    assert gcc.annual_revenue_rm > my.annual_revenue_rm
