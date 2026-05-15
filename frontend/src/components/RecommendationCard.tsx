type RecommendationCardProps = {
  title: string;
  action: string;
  impact: string;
  tone: "dust" | "weather" | "normal";
};

const toneStyles = {
  dust: "border-amber-200 bg-amber-50 text-amber-950",
  weather: "border-sky-200 bg-sky-50 text-sky-950",
  normal: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

export function RecommendationCard({ title, action, impact, tone }: RecommendationCardProps) {
  return (
    <section className={`rounded-lg border p-5 shadow-sm ${toneStyles[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Cleaning recommendation</p>
      <h2 className="mt-3 text-2xl font-bold leading-tight">{title}</h2>
      <p className="mt-3 text-base leading-6">{action}</p>
      <p className="mt-5 rounded-lg bg-white/70 px-4 py-3 text-xl font-bold shadow-sm">{impact}</p>
    </section>
  );
}
