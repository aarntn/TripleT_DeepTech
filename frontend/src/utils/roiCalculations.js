import { CARBON, MONTHS, SYSTEM_PARAMS } from "../constants/marketData";

export function generateMonthlyData(location, mw, tariffRmPerKwh) {
  const monthlyKwhPerMw = (location.irradiance * 1000 * 365) / 12;

  return MONTHS.map((month, index) => {
    const effWith = location.effWith[index];
    const effWithout = location.effWithout[index];
    const kwhWith = monthlyKwhPerMw * mw * (effWith / 100);
    const kwhWithout = monthlyKwhPerMw * mw * (effWithout / 100);
    const kwhRecovered = kwhWith - kwhWithout;
    const rmRecovered = kwhRecovered * tariffRmPerKwh;
    const carbonValue =
      kwhRecovered * CARBON.gridEmissionFactorTonnesPerKwh * CARBON.priceRmPerTonne;

    return {
      month,
      effWith,
      effWithout,
      kwhRecovered: Math.round(kwhRecovered),
      rmRecovered: Math.round(rmRecovered),
      carbonValue: Math.round(carbonValue),
    };
  });
}

export function computeMetrics(monthly, mw) {
  const annualKwhRecovered = monthly.reduce((sum, row) => sum + row.kwhRecovered, 0);
  const annualRevenue = monthly.reduce((sum, row) => sum + row.rmRecovered, 0);
  const annualCarbon = monthly.reduce((sum, row) => sum + row.carbonValue, 0);
  const systemCost = Math.round(mw * SYSTEM_PARAMS.systemCostPerMw);
  const annualOm = Math.round(mw * SYSTEM_PARAMS.annualOmPerMw);
  const annualNet = annualRevenue - annualOm;
  const payback = annualNet > 0 ? systemCost / annualNet : Number.POSITIVE_INFINITY;

  const { discountRate, projectLifeYears } = SYSTEM_PARAMS;
  const annuityFactor = (1 - (1 + discountRate) ** -projectLifeYears) / discountRate;
  const npv = Math.round(annualNet * annuityFactor - systemCost);

  return {
    annualKwhRecovered,
    annualRevenue,
    annualCarbon,
    systemCost,
    annualOm,
    annualNet,
    payback,
    npv,
  };
}

export function buildCumulativeData(metrics) {
  return Array.from({ length: 6 }, (_, year) => ({
    year: `Yr ${year}`,
    systemCostK: Math.round(metrics.systemCost / 1000),
    cumSavingsK: year === 0 ? 0 : Math.round((metrics.annualNet * year) / 1000),
  }));
}
