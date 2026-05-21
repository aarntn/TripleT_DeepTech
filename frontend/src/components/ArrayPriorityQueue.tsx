import { getPanelAutomationUi, sortPanelsByAutomation } from "../utils/panelStatusUi";
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
  const sortedPanels = sortPanelsByAutomation(panels);
  const cleanablePanels = panels.filter((panel) => {
    const state = getPanelAutomationUi(panel).state;
    return state === "scheduled" || state === "queued";
  });

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">Cleaning priority queue</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Cleaning decisions by panel block</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sorted by soiling likelihood and RM loss so O&amp;M teams can dispatch with justification.
          </p>
        </div>
        <button
          type="button"
          onClick={onCleanAll}
          disabled={cleanablePanels.length === 0}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Clean all now
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-white text-xs text-slate-500">
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
              const statusUi = getPanelAutomationUi(panel);
              const cleanable = statusUi.state === "scheduled" || statusUi.state === "queued";
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
                  <td className={`px-4 py-3 font-semibold ${statusUi.textClass}`}>{statusUi.label}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${causeStyles[panel.classifier.type]}`}>
                      {causeCopy[panel.classifier.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{panel.classifier.confidence}%</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{formatRM(panel.lossToday)}</td>
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
                        {cleaningIds.has(panel.id) ? "Cleaning..." : statusUi.actionLabel}
                      </button>
                    ) : statusUi.state === "deferred" ? (
                      <span className={statusUi.textClass}>{statusUi.actionLabel}</span>
                    ) : (
                      <span className={statusUi.textClass}>{statusUi.actionLabel}</span>
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
