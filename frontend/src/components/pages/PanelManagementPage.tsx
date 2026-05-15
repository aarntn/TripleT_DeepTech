import { ArrayPriorityQueue } from "../ArrayPriorityQueue";
import { ClassifierCard } from "../ClassifierCard";
import { EnergyTimelineChart } from "../EnergyTimelineChart";
import { FarmOperationsMap } from "../FarmOperationsMap";
import { MetricCard } from "../MetricCard";
import { RecommendationCard } from "../RecommendationCard";
import { getPanelStatus, type Scenario, type ScenarioId } from "../../data/mockSolarData";
import { formatRM, type RuntimePanel } from "../../utils/solarCalculations";
import { DataSource } from "../../hooks/useSolarGuardData";

type PanelManagementPageProps = {
  scenario: Scenario;
  scenarioId: ScenarioId;
  panels: RuntimePanel[];
  selectedPanel: RuntimePanel;
  cleaningIds: Set<string>;
  sensorTick: number;
  totals: {
    lostToday: number;
    lostThisWeek: number;
    savedIfCleaned: number;
  };
  recommendation: {
    title: string;
    action: string;
    impact: string;
    tone: string;
  };
  dirtyCount: number;
  onSelect: (id: string) => void;
  onClean: (id: string) => void;
  onCleanAll: () => void;
  dataSource: DataSource;
  lastUpdated: Date | null;
  onRefresh: () => void;
  refreshing: boolean;
  error: string | null;
  onClassify: () => void;
};

export function PanelManagementPage({
  scenario,
  scenarioId,
  panels,
  selectedPanel,
  cleaningIds,
  sensorTick,
  totals,
  recommendation,
  dirtyCount,
  onSelect,
  onClean,
  onCleanAll,
  dataSource,
  onRefresh,
  refreshing,
  error,
  onClassify,
}: PanelManagementPageProps) {
  const selectedStatus = getPanelStatus(selectedPanel.efficiency);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm flex items-start gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold">!</span>
          <div>
            <p className="font-bold">Backend Connection Issue</p>
            <p className="mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          label="RM lost today"
          value={formatRM(totals.lostToday)}
          helper="Estimated revenue leak from underperforming arrays."
          tone="loss"
        />
        <MetricCard
          label="RM lost this week"
          value={formatRM(totals.lostThisWeek)}
          helper="Seven-day loss from actual output below expected output."
          tone="loss"
        />
        <MetricCard
          label="RM saved if cleaned now"
          value={formatRM(totals.savedIfCleaned)}
          helper="Recoverable value from dust-classified panels only."
          tone="gain"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weather-aware operations story</p>
              {dataSource !== "mock" && (
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  dataSource === "backend" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                }`}>
                  {dataSource === "backend" ? "Live API" : "Mock Fallback"}
                </span>
              )}
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">{scenario.label}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{scenario.summary}</p>
          </div>
          <div className="flex flex-col gap-4 sm:min-w-[420px]">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dirty</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{dirtyCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Array</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{selectedPanel.id}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                <p className="mt-1 text-xs font-bold text-slate-900 leading-tight uppercase">{selectedStatus}</p>
              </div>
            </div>
            {dataSource === "backend" && (
              <div className="flex gap-2">
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {refreshing ? "Syncing..." : "Refresh Telemetry"}
                </button>
                <button
                  onClick={onClassify}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all active:scale-95"
                >
                  Re-classify Array
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <FarmOperationsMap
        panels={panels}
        selectedPanel={selectedPanel}
        sensorTick={sensorTick}
        recommendation={recommendation}
        onSelect={onSelect}
        onClean={onClean}
      />

      <ArrayPriorityQueue
        panels={panels}
        selectedId={selectedPanel.id}
        cleaningIds={cleaningIds}
        onSelect={onSelect}
        onClean={onClean}
        onCleanAll={onCleanAll}
      />

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <ClassifierCard panel={selectedPanel} />
        <RecommendationCard
          title={recommendation.title}
          action={recommendation.action}
          impact={recommendation.impact}
          tone={recommendation.tone as "dust" | "weather" | "normal"}
        />
      </section>

      <EnergyTimelineChart panel={selectedPanel} scenario={scenarioId} />
    </div>
  );
}
