import { ArrayPriorityQueue } from "../ArrayPriorityQueue";
import { ClassifierCard } from "../ClassifierCard";
import { EnergyTimelineChart } from "../EnergyTimelineChart";
import { FarmOperationsMap } from "../FarmOperationsMap";
import { MetricCard } from "../MetricCard";
import { RecommendationCard } from "../RecommendationCard";
import { getPanelStatus, type Scenario, type ScenarioId } from "../../data/mockSolarData";
import { formatRM, type RuntimePanel } from "../../utils/solarCalculations";

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
}: PanelManagementPageProps) {
  const selectedStatus = getPanelStatus(selectedPanel.efficiency);

  return (
    <div className="space-y-5">
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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weather-aware operations story</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{scenario.label}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{scenario.summary}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dirty arrays</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{dirtyCount}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{selectedPanel.id}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{selectedStatus}</p>
            </div>
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
