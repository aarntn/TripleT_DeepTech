import type { ClassifierData, ClassifierSource, ClassifierRetroResponse } from "../hooks/useClassifierPerformance";

type Props = {
  data: ClassifierData;
  source?: ClassifierSource;
  retro?: ClassifierRetroResponse | null;
};

type ClassMetrics = {
  precision: number;
  recall: number;
  f1: number;
  support?: number;
};

type ClassTheme = {
  border: string;
  bg: string;
  text: string;
  dot: string;
};

const classThemes: Record<string, ClassTheme> = {
  Dust: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  Weather: {
    border: "border-sky-200",
    bg: "bg-sky-50",
    text: "text-sky-800",
    dot: "bg-sky-500",
  },
  Normal: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
};

const fallbackTheme: ClassTheme = {
  border: "border-slate-200",
  bg: "bg-slate-50",
  text: "text-slate-700",
  dot: "bg-slate-400",
};

function themeFor(className: string) {
  return classThemes[className] ?? fallbackTheme;
}

function computeClassMetrics(matrix: readonly (readonly number[])[], i: number): ClassMetrics {
  const tp = matrix[i][i];
  const predictedPositive = matrix.reduce((sum, row) => sum + row[i], 0);
  const actualPositive = matrix[i].reduce((sum, v) => sum + v, 0);
  const precision = predictedPositive === 0 ? 0 : tp / predictedPositive;
  const recall = actualPositive === 0 ? 0 : tp / actualPositive;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1, support: actualPositive };
}

function computeMacroF1(matrix: readonly (readonly number[])[]) {
  return matrix.reduce((sum, _, i) => sum + computeClassMetrics(matrix, i).f1, 0) / matrix.length;
}

function computeOverallAccuracy(matrix: readonly (readonly number[])[]) {
  let correct = 0;
  let total = 0;
  matrix.forEach((row, i) =>
    row.forEach((value, j) => {
      total += value;
      if (i === j) correct += value;
    }),
  );
  return { correct, total };
}

function percent(value: number) {
  return `${Math.floor(value * 100)}%`;
}

function decimal(value: number) {
  return value.toFixed(2);
}

function HeroStat({ value, label, helper }: { value: string; label: string; helper: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#e9eaeb] bg-white p-4 sm:p-5">
      <p className="text-[38px] font-semibold leading-[44px] text-[#181d27]">{value}</p>
      <p className="mt-2 text-sm font-semibold text-[#181d27]">{label}</p>
      <p className="mt-1 text-sm leading-5 text-[#535862]">{helper}</p>
    </div>
  );
}

function PredictionGrid({
  classes,
  matrix,
}: {
  classes: readonly string[];
  matrix: readonly (readonly number[])[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="p-3 text-left font-medium text-[#717680]">Actual condition</th>
            {classes.map((className) => {
              const theme = themeFor(className);
              return (
                <th key={className} className={`rounded-md border p-3 font-semibold ${theme.border} ${theme.bg} ${theme.text}`}>
                  Predicted {className}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => {
            const actualClass = classes[rowIndex];
            const rowTheme = themeFor(actualClass);
            return (
              <tr key={actualClass}>
                <th className={`rounded-md border p-3 text-left font-semibold ${rowTheme.border} ${rowTheme.bg} ${rowTheme.text}`}>
                  Actual {actualClass}
                </th>
                {row.map((value, columnIndex) => {
                  const predictedClass = classes[columnIndex];
                  const theme = themeFor(predictedClass);
                  const correct = rowIndex === columnIndex;
                  const missed = !correct && value > 0;
                  return (
                    <td
                      key={`${actualClass}-${predictedClass}`}
                      className={`rounded-md border p-3 text-center ${
                        correct
                          ? `${theme.border} ${theme.bg} ${theme.text}`
                          : missed
                            ? "border-rose-300 bg-rose-50 text-rose-700"
                            : "border-[#e9eaeb] bg-white text-[#a4a7ae]"
                      }`}
                    >
                      <p className="text-lg font-semibold leading-6">{value}</p>
                      {missed ? <p className="text-xs font-medium">mistake</p> : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClassScoreCards({ classes, metrics }: { classes: readonly string[]; metrics: ClassMetrics[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {classes.map((className, index) => {
        const theme = themeFor(className);
        const metric = metrics[index];
        return (
          <article key={className} className="rounded-lg border border-[#e9eaeb] bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${theme.dot}`} />
                <h4 className="text-base font-semibold text-[#181d27]">{className}</h4>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${theme.bg} ${theme.text}`}>
                {metric.support ?? 0} samples
              </span>
            </div>

            <div className="mt-4 flex min-h-10 items-baseline gap-2">
              <p className={`text-[34px] font-semibold leading-10 ${theme.text}`}>{percent(metric.f1)}</p>
              <p className="text-sm font-medium leading-5 text-[#535862]">F1 score</p>
            </div>
            <p className="mt-1 text-sm leading-5 text-[#535862]">
              F1 balances false alarms and missed detections.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-[#e9eaeb] bg-[#fafafa] p-3">
                <p className="text-sm font-semibold text-[#181d27]">{decimal(metric.precision)}</p>
                <p className="text-xs leading-4 text-[#717680]">Precision: prediction reliability</p>
              </div>
              <div className="rounded-md border border-[#e9eaeb] bg-[#fafafa] p-3">
                <p className="text-sm font-semibold text-[#181d27]">{decimal(metric.recall)}</p>
                <p className="text-xs leading-4 text-[#717680]">Recall (sensitivity): cases found</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CompactValidationStrip({
  retro,
}: {
  retro: ClassifierRetroResponse;
}) {
  const { correct, total } = computeOverallAccuracy(retro.confusion_matrix);
  return (
    <section className="rounded-lg border border-[#e9eaeb] bg-[#fafafa] p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
        <div>
          <h3 className="text-base font-semibold text-[#181d27]">Real-weather check</h3>
          <p className="mt-1 text-sm leading-5 text-[#535862]">
            Open-Meteo data for Selangor, {retro.period_start.slice(0, 4)} · {retro.n_days} days.
          </p>
        </div>
        <div className="rounded-md border border-[#e9eaeb] bg-white p-4">
          <p className="text-2xl font-semibold text-[#181d27]">{percent(retro.weighted_f1)}</p>
          <p className="text-xs text-[#535862]">Weighted F1 score</p>
        </div>
        <div className="rounded-md border border-[#e9eaeb] bg-white p-4">
          <p className="text-2xl font-semibold text-[#181d27]">{correct}/{total}</p>
          <p className="text-xs text-[#535862]">Correct predictions</p>
        </div>
      </div>
    </section>
  );
}

export function ModelPerformanceCard({ data, source = "fallback", retro }: Props) {
  const { classes, confusionMatrix, architecture, inputs, benchmarkCitation, pilotNote } = data;
  const metrics = classes.map((_, index) => computeClassMetrics(confusionMatrix, index));
  const macroF1 = computeMacroF1(confusionMatrix);
  const { correct, total } = computeOverallAccuracy(confusionMatrix);
  const mistakes = total - correct;

  return (
    <section className="rounded-xl border border-[#e9eaeb] bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-7 text-[#181d27]">Model performance</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[#535862]">
            A quick confidence check for the classifier that decides whether output loss is dust, weather, or normal operation.
          </p>
        </div>
        <span className="w-fit rounded-full border border-[#e9eaeb] bg-[#fafafa] px-3 py-1 text-xs font-semibold text-[#414651]">
          {source === "backend" ? "Backend validation" : "Pre-pilot validation"}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <HeroStat value={percent(macroF1)} label="F1 score" helper="Overall model quality across Dust, Weather, and Normal." />
        <HeroStat value={`${correct}/${total}`} label="Correct predictions" helper={`The model correctly identified ${correct} out of ${total} samples.`} />
      </div>

      <p className="mt-4 rounded-lg border border-[#e9eaeb] bg-[#fafafa] p-4 text-sm leading-5 text-[#414651]">
        The model correctly identified <span className="font-semibold text-[#181d27]">{correct} out of {total}</span>{" "}
        validation samples. {mistakes === 0 ? "No mistakes were found in this test set." : `${mistakes} sample${mistakes === 1 ? " was" : "s were"} misclassified.`}
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <section className="rounded-lg border border-[#e9eaeb] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#181d27]">Prediction grid</h3>
              <p className="mt-1 text-sm leading-5 text-[#535862]">
                Diagonal cells are correct. Red cells are mistakes.
              </p>
            </div>
            <div className="flex gap-2 text-xs text-[#717680]">
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" /> correct</span>
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-rose-500" /> mistake</span>
            </div>
          </div>
          <div className="mt-4">
            <PredictionGrid classes={classes} matrix={confusionMatrix} />
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-[#181d27]">Performance by condition</h3>
          <p className="mt-1 text-sm leading-5 text-[#535862]">
            Each card shows how well the model handled one condition.
          </p>
          <div className="mt-4">
            <ClassScoreCards classes={classes} metrics={metrics} />
          </div>
        </section>
      </div>

      {retro ? (
        <div className="mt-5">
          <CompactValidationStrip retro={retro} />
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-4 rounded-lg border border-[#e9eaeb] bg-white p-4 sm:p-5 text-sm leading-5 text-[#535862] md:flex-row md:items-start md:justify-between">
        <div>
          <span className="font-semibold text-[#181d27]">Signals used:</span>{" "}
          {[...architecture, ...inputs].join(", ")}
        </div>
        <div className="md:max-w-xl">
          <span className="font-semibold text-[#181d27]">Benchmark:</span> {benchmarkCitation}
          <span className="block text-[#717680]">{pilotNote}</span>
        </div>
      </div>
    </section>
  );
}
