type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  tone: "loss" | "gain" | "neutral";
};

const toneStyles = {
  loss: "text-rose-600 bg-rose-50 border-rose-100",
  gain: "text-emerald-700 bg-emerald-50 border-emerald-100",
  neutral: "text-slate-900 bg-white border-slate-200",
};

export function MetricCard({ label, value, helper, tone }: MetricCardProps) {
  return (
    <article className={`rounded-lg border p-5 shadow-sm ${toneStyles[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-normal">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-600">{helper}</p>
    </article>
  );
}
