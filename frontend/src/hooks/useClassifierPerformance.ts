import { useState, useEffect } from "react";
import { api, ClassifierRetroResponse } from "../lib/api";
import { classifierValidation } from "../data/mockSolarData";

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
  const [retro, setRetro] = useState<ClassifierRetroResponse | null>(null);

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
