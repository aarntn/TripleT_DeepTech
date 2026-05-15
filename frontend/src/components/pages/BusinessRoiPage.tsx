import { ROICalculator } from "../ROICalculator";
import { formatRM, type MarketKey, type MarketProfile, type RoiResult } from "../../utils/solarCalculations";

type BusinessRoiPageProps = {
  farmMw: number;
  marketKey: MarketKey;
  tariff: number;
  systemCost: number;
  hormuzShock: boolean;
  market: MarketProfile;
  effectiveTariff: number;
  roi: RoiResult;
  onFarmMwChange: (value: number) => void;
  onMarketKeyChange: (value: MarketKey) => void;
  onTariffChange: (value: number) => void;
  onSystemCostChange: (value: number) => void;
  onHormuzShockChange: (value: boolean) => void;
};

export function BusinessRoiPage(props: BusinessRoiPageProps) {
  const { farmMw, market, effectiveTariff, roi } = props;

  return (
    <div className="space-y-5">
      <ROICalculator {...props} />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-700">
              Monthly dataset - {farmMw} MW, {market.label}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Mock assumptions for demo transparency. Effective tariff: RM {effectiveTariff.toFixed(2)}/kWh.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
            Frontend-only data
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Eff. w/ cleaning</th>
                <th className="px-4 py-3">Eff. w/o cleaning</th>
                <th className="px-4 py-3">Revenue recovered</th>
                <th className="px-4 py-3">kWh recovered</th>
                <th className="px-4 py-3">Carbon credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {roi.monthly.map((row) => (
                <tr key={row.month}>
                  <td className="px-4 py-3 font-semibold text-slate-700">{row.month}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{row.effWith}%</td>
                  <td className="px-4 py-3 font-semibold text-rose-600">{row.effWithout}%</td>
                  <td className="px-4 py-3 font-bold text-slate-950">{formatRM(row.revenueRecovered)}</td>
                  <td className="px-4 py-3 text-slate-600">{row.kwhRecovered.toLocaleString("en-MY")}</td>
                  <td className="px-4 py-3 text-slate-600">{formatRM(row.carbonCredit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
