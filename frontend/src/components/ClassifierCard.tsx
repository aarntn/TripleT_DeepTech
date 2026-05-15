import type { RuntimePanel } from "../utils/solarCalculations";

type ClassifierCardProps = {
  panel: RuntimePanel;
};

const typeStyles = {
  Dust: "bg-amber-100 text-amber-800 border-amber-200",
  Weather: "bg-sky-100 text-sky-800 border-sky-200",
  Normal: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function ClassifierCard({ panel }: ClassifierCardProps) {
  const { classifier } = panel;

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Dust vs weather classifier</p>
          <h2 className="mt-2 text-2xl font-bold">{panel.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-sm font-bold ${typeStyles[classifier.type]}`}>
            Type: {classifier.type}
          </span>
          <span className="rounded-full border border-indigo-300 bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-800">
            Confidence: {classifier.confidence}%
          </span>
        </div>
      </div>
      <p className="mt-5 text-lg leading-7 text-slate-100">{classifier.cause}</p>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-sm">
        <div>
          <p className="text-slate-400">Efficiency</p>
          <p className="mt-1 font-bold">{panel.efficiency}%</p>
        </div>
        <div>
          <p className="text-slate-400">Model mode</p>
          <p className="mt-1 font-bold">Mock ML</p>
        </div>
        <div>
          <p className="text-slate-400">Input</p>
          <p className="mt-1 font-bold">IoT feed</p>
        </div>
      </div>
    </section>
  );
}
