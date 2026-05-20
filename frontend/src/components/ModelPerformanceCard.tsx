import type { ClassifierData, ClassifierSource, ClassifierRetroResponse } from "../hooks/useClassifierPerformance";

type Props = {
  data: ClassifierData;
  source?: ClassifierSource;
  retro?: ClassifierRetroResponse | null;
};

type ClassMetrics = { precision: number; recall: number; f1: number };

function computeClassMetrics(
  matrix: readonly (readonly number[])[],
  i: number,
): ClassMetrics {
  const tp = matrix[i][i];
  const predictedPositive = matrix.reduce((sum, row) => sum + row[i], 0);
  const actualPositive = matrix[i].reduce((sum, v) => sum + v, 0);
  const precision = predictedPositive === 0 ? 0 : tp / predictedPositive;
  const recall = actualPositive === 0 ? 0 : tp / actualPositive;
  const f1 =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

function computeMacroF1(matrix: readonly (readonly number[])[]): number {
  const n = matrix.length;
  const total = matrix.reduce(
    (sum, _, i) => sum + computeClassMetrics(matrix, i).f1,
    0,
  );
  return total / n;
}

function computeOverallAccuracy(matrix: readonly (readonly number[])[]): {
  correct: number;
  total: number;
} {
  let correct = 0;
  let total = 0;
  matrix.forEach((row, i) =>
    row.forEach((v, j) => {
      total += v;
      if (i === j) correct += v;
    }),
  );
  return { correct, total };
}

const classTints = [
  { bg: "bg-amber-50", text: "text-amber-800" },
  { bg: "bg-sky-50", text: "text-sky-800" },
  { bg: "bg-emerald-50", text: "text-emerald-800" },
];

function fmt(n: number): string {
  return n.toFixed(2);
}

export function ModelPerformanceCard({ data, source = "fallback", retro }: Props) {
  const { classes, confusionMatrix, architecture, inputs, benchmarkCitation, pilotNote, testSetSize } = data;
  const metrics = classes.map((_, i) => computeClassMetrics(confusionMatrix, i));
  const macroF1 = computeMacroF1(confusionMatrix);
  const { correct, total } = computeOverallAccuracy(confusionMatrix);

  return (
    <div className="rounded-xl border border-[#e9eaeb] bg-white p-5 shadow-[0_1px_2px_rgba(10,13,18,0.05)]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#181d27]">
          SolarSense Classifier · Model Performance
        </p>
        {source === "backend" ? (
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
            Backend model · Real validation
          </span>
        ) : (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Pre-pilot · Synthetic validation
          </span>
        )}
      </div>

      {/* Architecture + input chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {architecture.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-[#e9eaeb] bg-[#f8fafc] px-2.5 py-1 text-xs font-semibold text-[#181d27]"
          >
            {tag}
          </span>
        ))}
        {inputs.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-[#e9eaeb] bg-[#f8fafc] px-2.5 py-1 text-xs font-semibold text-[#535862]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Divider */}
      <div className="mt-4 border-t border-[#e9eaeb] pt-4">
        <div className="grid min-w-0 grid-cols-2 gap-4">

          {/* Left: confusion matrix */}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#717680]">
              Confusion Matrix ({testSetSize} samples)
            </p>
            <table className="mt-2 w-full border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-[#717680]">
                    Act ↓ Pred →
                  </th>
                  {classes.map((cls, j) => (
                    <th
                      key={cls}
                      className={`px-2 py-1.5 font-semibold ${classTints[j].bg} ${classTints[j].text}`}
                    >
                      {cls[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confusionMatrix.map((row, i) => (
                  <tr key={classes[i]}>
                    <td
                      className={`px-2 py-1.5 text-left font-semibold ${classTints[i].bg} ${classTints[i].text}`}
                    >
                      {classes[i]}
                    </td>
                    {row.map((val, j) => (
                      <td
                        key={j}
                        className={
                          i === j
                            ? "bg-emerald-50 px-2 py-1.5 font-semibold text-emerald-700"
                            : "px-2 py-1.5 text-[#717680]"
                        }
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right: metrics table + callouts */}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#717680]">
              Per-class Metrics
            </p>
            <table className="mt-2 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#fafafa] text-[#717680]">
                  <th className="px-2 py-1.5 text-left font-semibold">Class</th>
                  <th className="px-2 py-1.5 text-right font-semibold">P</th>
                  <th className="px-2 py-1.5 text-right font-semibold">R</th>
                  <th className="px-2 py-1.5 text-right font-semibold">F1</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={classes[i]} className="border-t border-[#f1f5f9]">
                    <td className="px-2 py-1.5 font-semibold text-[#181d27]">{classes[i]}</td>
                    <td className="px-2 py-1.5 text-right text-[#535862]">{fmt(m.precision)}</td>
                    <td className="px-2 py-1.5 text-right text-[#535862]">{fmt(m.recall)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-[#181d27]">{fmt(m.f1)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[#e9eaeb] bg-[#fafafa]">
                  <td className="px-2 py-1.5 font-semibold text-[#181d27]">Avg</td>
                  <td className="px-2 py-1.5 text-right text-[#535862]">
                    {fmt(metrics.reduce((s, m) => s + m.precision, 0) / metrics.length)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-[#535862]">
                    {fmt(metrics.reduce((s, m) => s + m.recall, 0) / metrics.length)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-emerald-700">
                    {fmt(macroF1)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Summary callouts */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-center">
                <p className="text-xl font-semibold text-emerald-700">
                  {Math.round(macroF1 * 100)}%
                </p>
                <p className="text-[10px] text-[#717680]">Macro F1</p>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 py-2 text-center">
                <p className="text-xl font-semibold text-sky-700">
                  {correct}/{total}
                </p>
                <p className="text-[10px] text-[#717680]">Correct</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 rounded-lg border border-[#e9eaeb] bg-[#fafafa] p-3 text-xs">
        <p className="text-[#535862]">
          <span className="font-semibold">Architecture target:</span>{" "}
          {benchmarkCitation}
        </p>
        <p className="mt-1 text-[#717680]">{pilotNote}</p>
      </div>

      {/* Retrospective validation section — only shown when backend responds */}
      {retro && (
        <div className="mt-4 border-t border-[#e9eaeb] pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#181d27]">
              Retrospective Validation · Real Weather Data
            </p>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              Open-Meteo · Selangor {retro.period_start.slice(0, 4)} · {retro.n_days} days
            </span>
          </div>

          <div className="mt-3 grid min-w-0 grid-cols-2 gap-4">
            {/* Left: retrospective confusion matrix */}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#717680]">
                Confusion Matrix ({retro.n_days} real-world days)
              </p>
              <table className="mt-2 w-full border-collapse text-center text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-[#717680]">
                      Act ↓ Pred →
                    </th>
                    {retro.classes.map((cls, j) => (
                      <th
                        key={cls}
                        className={`px-2 py-1.5 font-semibold ${classTints[j].bg} ${classTints[j].text}`}
                      >
                        {cls[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {retro.confusion_matrix.map((row, i) => (
                    <tr key={retro.classes[i]}>
                      <td
                        className={`px-2 py-1.5 text-left font-semibold ${classTints[i].bg} ${classTints[i].text}`}
                      >
                        {retro.classes[i]}
                      </td>
                      {row.map((val, j) => (
                        <td
                          key={j}
                          className={
                            i === j
                              ? "bg-emerald-50 px-2 py-1.5 font-semibold text-emerald-700"
                              : "px-2 py-1.5 text-[#717680]"
                          }
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right: per-class metrics + callouts */}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#717680]">
                Per-class Metrics
              </p>
              <table className="mt-2 w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#fafafa] text-[#717680]">
                    <th className="px-2 py-1.5 text-left font-semibold">Class</th>
                    <th className="px-2 py-1.5 text-right font-semibold">P</th>
                    <th className="px-2 py-1.5 text-right font-semibold">R</th>
                    <th className="px-2 py-1.5 text-right font-semibold">F1</th>
                  </tr>
                </thead>
                <tbody>
                  {retro.classes.map((cls) => {
                    const m = retro.per_class[cls];
                    return (
                      <tr key={cls} className="border-t border-[#f1f5f9]">
                        <td className="px-2 py-1.5 font-semibold text-[#181d27]">{cls}</td>
                        <td className="px-2 py-1.5 text-right text-[#535862]">{fmt(m.precision)}</td>
                        <td className="px-2 py-1.5 text-right text-[#535862]">{fmt(m.recall)}</td>
                        <td className="px-2 py-1.5 text-right font-semibold text-[#181d27]">{fmt(m.f1)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-[#e9eaeb] bg-[#fafafa]">
                    <td className="px-2 py-1.5 font-semibold text-[#181d27]">Avg</td>
                    <td colSpan={2} />
                    <td className="px-2 py-1.5 text-right font-semibold text-emerald-700">
                      {fmt(retro.weighted_f1)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-center">
                  <p className="text-xl font-semibold text-emerald-700">
                    {Math.round(retro.weighted_f1 * 100)}%
                  </p>
                  <p className="text-[10px] text-[#717680]">Weighted F1</p>
                </div>
                <div className="rounded-lg border border-sky-200 bg-sky-50 py-2 text-center">
                  <p className="text-xl font-semibold text-sky-700">
                    {Math.round(retro.accuracy * 100)}%
                  </p>
                  <p className="text-[10px] text-[#717680]">Accuracy</p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-[#717680]">
            Weighted F1 ({fmt(retro.weighted_f1)}) weights each class by frequency — the correct metric for
            Malaysia's climate where Weather dominates ({retro.per_class["Weather"]?.support ?? "?"} of {retro.n_days} days).
            Dust recall {fmt(retro.per_class["Dust"]?.recall ?? 0)} on real 2024 data; pilot retraining
            on field measurements will improve this directly.
          </p>
        </div>
      )}

    </div>
  );
}
