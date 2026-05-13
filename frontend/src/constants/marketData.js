export const MONTHS = [
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
];

export const LOCATIONS = {
  malaysia: {
    id: "malaysia",
    label: "Malaysia",
    baseTariff: 0.35,
    irradiance: 4.5,
    waterSelfSupply: 0.72,
    waterSavedPerMwMonth: 1200,
    note: "Humid tropical baseline; higher rainfall supports the water loop.",
    waterNote: "Assumes 2,500mm average annual rainfall and seasonal storage.",
    effWith: [97, 94, 97, 94, 97, 94, 97, 94, 97, 94, 97, 94],
    effWithout: [98, 95.5, 93, 90.5, 88, 85.5, 83, 80.5, 78, 75.5, 73, 70.5],
  },
  gcc: {
    id: "gcc",
    label: "GCC desert",
    baseTariff: 0.42,
    irradiance: 5.8,
    waterSelfSupply: 0.18,
    waterSavedPerMwMonth: 1850,
    note: "High irradiance with heavier dust loading and lower water self-supply.",
    waterNote: "Assumes arid climate operation with imported or stored cleaning water.",
    effWith: [96, 88, 96, 88, 96, 88, 96, 88, 96, 88, 96, 88],
    effWithout: [98, 91, 84, 77, 70, 65, 65, 65, 65, 65, 65, 65],
  },
};

export const HORMUZ = {
  tariffMultiplier: 1.25,
  sourceNote:
    "A Strait of Hormuz disruption scenario applies a 25% tariff shock to recovered solar output.",
};

export const SYSTEM_PARAMS = {
  systemCostPerMw: 120000,
  annualOmPerMw: 15000,
  discountRate: 0.1,
  projectLifeYears: 7,
};

export const CARBON = {
  priceRmPerTonne: 40,
  gridEmissionFactorTonnesPerKwh: 0.000585,
};
