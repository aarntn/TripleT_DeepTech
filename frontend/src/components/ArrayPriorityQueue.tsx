import { getPanelStatus } from "../data/mockSolarData";
import { formatRM, type RuntimePanel } from "../utils/solarCalculations";

type ArrayPriorityQueueProps = {
  panels: RuntimePanel[];
  selectedId: string;
  cleaningIds: Set<string>;
  onSelect: (id: string) => void;
  onClean: (id: string) => void;
  onCleanAll: () => void;
};

const causeStyles = {
  Dust: "bg-amber-50 text-amber-700 border-amber-200",
  Weather: "bg-sky-50 text-sky-700 border-sky-200",
  Normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusStyles = {
  Clean: "text-emerald-700",
  "Dust suspected": "text-amber-700",
  "Heavy loss": "text-rose-700",
};

const statusCopy = {
  Clean: "Normal",
  "Dust suspected": "Soiling suspected",
  "Heavy loss": "High loss",
};

const causeCopy = {
  Dust: "Soiling",
  Weather: "Weather",
  Normal: "Normal",
};

export function ArrayPriorityQueue({
  panels,
  selectedId,
  cleaningIds,
  onSelect,
  onClean,
  onCleanAll,
}: ArrayPriorityQueueProps) {
  const sortedPanels = [...panels].sort((a, b) => {
    const cleanableA = a.classifier.type === "Dust" ? 1 : 0;
    const cleanableB = b.classifier.type === "Dust" ? 1 : 0;
    return cleanableB - cleanableA || b.lossToday - a.lossToday;
  });
  const dirtyCount = panels.filter((panel) => panel.classifier.type === "Dust" && panel.efficiency < 91).length;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cleaning priority queue</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Work-order decisions by panel block</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sorted by soiling likelihood and RM loss so O&amp;M teams can dispatch with justification.
          </p>
        </div>
        <button
          type="button"
          onClick={onCleanAll}
          disabled={dirtyCount === 0}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Create all cleaning work orders
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Panel block</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Cause</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Loss today</th>
              <th className="px-4 py-3">Recommended action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedPanels.map((panel) => {
              const status = getPanelStatus(panel.efficiency);
              const cleanable = panel.classifier.type === "Dust" && status !== "Clean";
              const selected = panel.id === selectedId;

              return (
                <tr
                  key={panel.id}
                  onClick={() => onSelect(panel.id)}
                  className={`cursor-pointer transition hover:bg-slate-50 ${selected ? "bg-sky-50/70" : "bg-white"}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{panel.id}</p>
                    <p className="text-xs text-slate-500">{panel.name}</p>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${statusStyles[status]}`}>{statusCopy[status]}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${causeStyles[panel.classifier.type]}`}>
                      {causeCopy[panel.classifier.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{panel.classifier.confidence}%</td>
                  <td className="px-4 py-3 font-semibold text-rose-600">{formatRM(panel.lossToday)}</td>
                  <td className="px-4 py-3">
                    {cleanable ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onClean(panel.id);
                        }}
                        className="rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        {cleaningIds.has(panel.id) ? "Creating..." : "Create work order"}
                      </button>
                    ) : panel.classifier.type === "Weather" ? (
                      <span className="font-semibold text-sky-700">Defer: weather-related</span>
                    ) : (
                      <span className="font-semibold text-emerald-700">Monitor only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
