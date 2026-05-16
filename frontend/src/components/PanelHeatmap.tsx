import { sensorSamples } from "../data/mockSolarData";
import type { RuntimePanel } from "../utils/solarCalculations";
import { PanelCard } from "./PanelCard";

type PanelHeatmapProps = {
  panels: RuntimePanel[];
  selectedId: string;
  cleaningIds: Set<string>;
  sensorTick: number;
  onSelect: (id: string) => void;
  onClean: (id: string) => void;
  onCleanAll: () => void;
};

export function PanelHeatmap({
  panels,
  selectedId,
  cleaningIds,
  sensorTick,
  onSelect,
  onClean,
  onCleanAll,
}: PanelHeatmapProps) {
  const sample = sensorSamples[sensorTick % sensorSamples.length];
  const dirtyCount = panels.filter((panel) => panel.classifier.type === "Dust" && panel.efficiency < 91).length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Panel block efficiency heatmap</h2>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Demo sensor feed
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Irradiance {sample.irradiance.toFixed(1)} kWh/m2, module temp {sample.panelTemp}°C,
            humidity {sample.humidity}%, wind {sample.wind} m/s
          </p>
        </div>
        <button
          type="button"
          onClick={onCleanAll}
          disabled={dirtyCount === 0}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Simulate cleaning work orders
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {panels.map((panel) => (
          <PanelCard
            key={panel.id}
            panel={panel}
            selected={selectedId === panel.id}
            cleaning={cleaningIds.has(panel.id)}
            onSelect={onSelect}
            onClean={onClean}
          />
        ))}
      </div>
    </section>
  );
}
