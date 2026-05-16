import { getPanelStatus, type ClassificationType } from "../data/mockSolarData";
import { formatRM, type RuntimePanel } from "../utils/solarCalculations";

type PanelCardProps = {
  panel: RuntimePanel;
  selected: boolean;
  cleaning: boolean;
  onSelect: (id: string) => void;
  onClean: (id: string) => void;
};

const statusStyles = {
  Clean: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Dust suspected": "border-amber-200 bg-amber-50 text-amber-800",
  "Heavy loss": "border-rose-200 bg-rose-50 text-rose-800",
};

const barStyles = {
  Clean: "bg-emerald-500",
  "Dust suspected": "bg-amber-500",
  "Heavy loss": "bg-rose-500",
};

const classificationLabel: Record<ClassificationType, string> = {
  Dust: "Soiling signal",
  Weather: "Weather signal",
  Normal: "Normal",
};

const statusCopy = {
  Clean: "Normal",
  "Dust suspected": "Soiling suspected",
  "Heavy loss": "High loss",
};

export function PanelCard({ panel, selected, cleaning, onSelect, onClean }: PanelCardProps) {
  const status = getPanelStatus(panel.efficiency);
  const canClean = panel.classifier.type === "Dust" && status !== "Clean";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(panel.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(panel.id);
      }}
      className={`relative rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        selected ? "border-sky-500 ring-4 ring-sky-100" : "border-slate-200"
      } ${cleaning ? "animate-cleanPulse" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{panel.id}</p>
          <p className="text-xs text-slate-500">{panel.name}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
          {statusCopy[status]}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-between">
          <p className="text-3xl font-semibold text-slate-950">{panel.efficiency}%</p>
          <p className="text-right text-sm font-semibold text-rose-600">{formatRM(panel.lossToday)}</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div
            className={`h-2 rounded-full ${barStyles[status]}`}
            style={{ width: `${Math.max(8, panel.efficiency)}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-slate-500">{classificationLabel[panel.classifier.type]}</span>
          <span className="text-slate-500">estimated loss today</span>
        </div>
      </div>

      {canClean && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClean(panel.id);
          }}
          className="mt-4 w-full rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {cleaning ? "Simulating work order..." : "Simulate work order"}
        </button>
      )}
    </article>
  );
}
