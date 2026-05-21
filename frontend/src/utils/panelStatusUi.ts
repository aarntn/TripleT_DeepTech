import { getPanelStatus, type ClassificationType, type PanelStatus } from "../data/mockSolarData";
import type { RuntimePanel } from "./solarCalculations";

export type PanelAutomationState = "normal" | "scheduled" | "queued" | "deferred";

export type PanelAutomationUi = {
  state: PanelAutomationState;
  rawStatus: PanelStatus;
  label: string;
  shortLabel: string;
  actionLabel: string;
  badgeClass: string;
  textClass: string;
  dotClass: string;
  barClass: string;
  mapFill: string;
};

const causePriority: Record<ClassificationType, number> = {
  Dust: 3,
  Weather: 2,
  Normal: 1,
};

const getForecastLoss = (panel: RuntimePanel) =>
  panel.forecast.reduce((sum, point) => sum + Math.max(0, Math.round((point.expected - point.forecast) * 0.42)), 0);

const isHighPriorityCleaning = (panel: RuntimePanel) => {
  const soilingIndex = Math.max(0, Math.min(100, Math.round((100 - panel.efficiency) * 1.55)));
  return soilingIndex >= 55 || getForecastLoss(panel) >= 300;
};

export const getPanelAutomationUi = (panel: RuntimePanel): PanelAutomationUi => {
  const rawStatus = getPanelStatus(panel.efficiency);
  const isNormal = panel.cleaned || rawStatus === "Clean";
  const state: PanelAutomationState = isNormal
    ? "normal"
    : panel.classifier.type === "Weather"
      ? "deferred"
      : rawStatus === "Heavy loss" || isHighPriorityCleaning(panel)
        ? "queued"
        : "scheduled";

  const uiByState: Record<PanelAutomationState, Omit<PanelAutomationUi, "state" | "rawStatus">> = {
    normal: {
      label: "Normal",
      shortLabel: "Normal",
      actionLabel: "Monitor only",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
      textClass: "text-emerald-700",
      dotClass: "bg-emerald-500",
      barClass: "bg-emerald-500",
      mapFill: "rgba(16, 185, 129, 0.66)",
    },
    scheduled: {
      label: "Auto-clean scheduled",
      shortLabel: "Scheduled",
      actionLabel: "Clean now",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
      textClass: "text-amber-700",
      dotClass: "bg-amber-500",
      barClass: "bg-amber-500",
      mapFill: "rgba(245, 158, 11, 0.72)",
    },
    queued: {
      label: "Auto-clean queued",
      shortLabel: "Queued",
      actionLabel: "Clean now",
      badgeClass: "border-sky-200 bg-sky-50 text-sky-800",
      textClass: "text-sky-700",
      dotClass: "bg-sky-500",
      barClass: "bg-sky-500",
      mapFill: "rgba(14, 165, 233, 0.74)",
    },
    deferred: {
      label: "Weather hold",
      shortLabel: "Weather hold",
      actionLabel: "Defer: weather-related",
      badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
      textClass: "text-slate-700",
      dotClass: "bg-slate-500",
      barClass: "bg-slate-400",
      mapFill: "rgba(100, 116, 139, 0.62)",
    },
  };

  return { state, rawStatus, ...uiByState[state] };
};

export const sortPanelsByAutomation = (panels: RuntimePanel[]) =>
  [...panels].sort((a, b) => {
    const priority = { queued: 4, scheduled: 3, deferred: 2, normal: 1 };
    const stateDiff = priority[getPanelAutomationUi(b).state] - priority[getPanelAutomationUi(a).state];
    if (stateDiff !== 0) return stateDiff;
    return causePriority[b.classifier.type] - causePriority[a.classifier.type] || b.lossToday - a.lossToday;
  });
