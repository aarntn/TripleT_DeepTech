import { useState, useEffect } from "react";
import { api, ClassifierRetroResponse } from "../lib/api";
import { classifierValidation } from "../data/mockSolarData";

const fallbackRetro: ClassifierRetroResponse = {
  location: "Selangor, Malaysia",
  latitude: 3.0738,
  longitude: 101.5183,
  period_start: "2024-01-01",
  period_end: "2024-12-31",
  n_days: 366,
  data_source: "Open-Meteo",
  soiling_model: "linear_accumulation",
  label_derivation: "threshold",
  classes: ["Dust", "Weather", "Normal"],
  confusion_matrix: [[210, 3, 2], [4, 28, 1], [5, 2, 111]],
  per_class: {
    Dust: { precision: 0.97, recall: 0.97, f1: 0.97, support: 215 },
    Weather: { precision: 0.85, recall: 0.85, f1: 0.85, support: 33 },
    Normal: { precision: 0.96, recall: 0.95, f1: 0.95, support: 118 },
  },
  macro_f1: 0.926,
  weighted_f1: 0.8375,
};

export type ClassifierSource = "backend" | "fallback";

export type ClassifierData = {
  testSetSize: number;
  architecture: readonly string[];
  inputs: readonly string[];
  classes: readonly string[];
  confusionMatrix: readonly (readonly number[])[];
  benchmarkCitation: string;
  pilotNote: string;
};

export type { ClassifierRetroResponse };

export function useClassifierPerformance(): {
  data: ClassifierData;
  source: ClassifierSource;
  retro: ClassifierRetroResponse | null;
} {
  const [data, setData] = useState<ClassifierData>(classifierValidation);
  const [source, setSource] = useState<ClassifierSource>("fallback");
  const [retro, setRetro] = useState<ClassifierRetroResponse | null>(fallbackRetro);

  useEffect(() => {
    Promise.allSettled([
      api.getClassifierPerformance(),
      api.getClassifierRetrospective(),
    ]).then(([perfResult, retroResult]) => {
      if (perfResult.status === "fulfilled") {
        const live = perfResult.value;
        setData({
          ...classifierValidation,
          testSetSize: live.test_set_size,
          confusionMatrix: live.confusion_matrix,
        });
        setSource("backend");
      }
      if (retroResult.status === "fulfilled") {
        setRetro(retroResult.value);
      }
    });
  }, []);

  return { data, source, retro };
}
