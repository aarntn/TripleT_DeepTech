import { type ReactNode, useState } from "react";

import { EnergyTimelineChart } from "../EnergyTimelineChart";
import { FarmOperationsMap } from "../FarmOperationsMap";
import { type ScenarioId } from "../../data/mockSolarData";
import { getPanelAutomationUi } from "../../utils/panelStatusUi";
import { formatRM, type RuntimePanel } from "../../utils/solarCalculations";

const PANEL_RATED_KW = 40;

const PANEL_SPECS = {
  capacity: "40 kWp block",
  module: "LONGi Hi-MO 5",
  inverter: "Huawei SUN2000",
  installed: "18 Mar 2024",
  location: "3.0738, 101.5183",
};

const isPanelDirty = (panel: RuntimePanel) => {
  const state = getPanelAutomationUi(panel).state;
  return state === "scheduled" || state === "queued";
};

const getSoilingIndex = (efficiency: number) => Math.max(0, Math.min(100, Math.round((100 - efficiency) * 1.55)));

const getForecastLoss = (panel: RuntimePanel) =>
  panel.forecast.reduce((sum, point) => sum + Math.max(0, Math.round((point.expected - point.forecast) * 0.42)), 0);

const getPriorityLabel = (panel: RuntimePanel) => {
  const soilingIndex = getSoilingIndex(panel.efficiency);
  const forecastLoss = getForecastLoss(panel);

  if (soilingIndex >= 55 || forecastLoss >= 300) return "High";
  if (soilingIndex >= 20 || forecastLoss >= 80) return "Medium";
  return "Low";
};

const getOperationalStatus = (panel: RuntimePanel) => {
  if (panel.efficiency < 25) return "Offline";
  if (panel.efficiency < 65 || panel.classifier.type === "Dust") return "Fault";
  return "Active";
};

type AutoCleaningPlan = {
  label: string;
  title: string;
  startWindow: string;
  detailRows: Array<{ label: string; value: string }>;
  note?: string;
  tone: "success" | "warning" | "info" | "neutral";
};

const getAutoCleaningPlan = (panel: RuntimePanel): AutoCleaningPlan => {
  const automation = getPanelAutomationUi(panel);
  const scheduledMinute = String((20 + panel.id.charCodeAt(1) * 7) % 60).padStart(2, "0");

  if (automation.state === "normal") {
    return {
      label: "Standby",
      title: "No cleaning cycle needed",
      startWindow: "Next scan 02:00",
      detailRows: [],
      tone: "success",
    };
  }

  if (automation.state === "deferred") {
    return {
      label: "Weather hold",
      title: "Auto-clean deferred",
      startWindow: "Recheck after irradiance stabilizes",
      detailRows: [
        { label: "Trigger", value: "Weather-linked output dip" },
        { label: "Action", value: "Hold cleaning cycle" },
      ],
      note: "Cleaning waits until the weather signal clears.",
      tone: "neutral",
    };
  }

  if (automation.state === "queued") {
    return {
      label: "Queued",
      title: "Automatic cleaning queued",
      startWindow: `Today 18:${scheduledMinute}`,
      detailRows: [
        { label: "Trigger", value: "High soiling signal" },
        { label: "Expected savings", value: formatRM(panel.savedIfCleaned || panel.lossThisWeek) },
      ],
      tone: "info",
    };
  }

  return {
    label: "Scheduled",
    title: "Automatic cleaning scheduled",
    startWindow: `Tonight 22:${scheduledMinute}`,
    detailRows: [
      { label: "Trigger", value: "Soiling trend" },
      { label: "Expected savings", value: formatRM(panel.savedIfCleaned || panel.lossThisWeek) },
    ],
    tone: "warning",
  };
};

const getPanelTelemetry = (panel: RuntimePanel) => {
  const latest = panel.timeline[panel.timeline.length - 1] ?? {
    actual: 0,
    expected: PANEL_RATED_KW,
    irradiance: 5.1,
  };
  const sensor = panel.backendSensor;
  const currentOutput = sensor ? sensor.actual_output_kwh : (panel.efficiency / 100) * PANEL_RATED_KW;
  const voltage = Math.round(615 + panel.efficiency * 0.75 + panel.id.charCodeAt(1) * 2);
  const current = Math.round((currentOutput * 1000) / Math.max(voltage, 1));
  const irradiance = sensor ? Math.round(sensor.irradiance_kwh_m2 * 1000) : Math.round(latest.irradiance * 185);
  const panelTemperature = sensor ? Math.round(sensor.temp_c) : Math.round(39 + (irradiance - 850) / 55 + (100 - panel.efficiency) * 0.08);
  const ambientTemperature = sensor ? Math.round(sensor.temp_c) : Math.max(28, panelTemperature - 9);
  const windSpeed = panel.classifier.type === "Weather" ? 12 : panel.classifier.type === "Dust" ? 5 : 7;
  const peakPower = Math.min(PANEL_RATED_KW, currentOutput * 1.08);
  const performanceRatio = Math.max(0.45, Math.min(0.98, panel.efficiency / 100 - 0.04));
  const todayEnergy = Math.round(sensor?.actual_output_kwh ?? latest.actual);
  const monthEnergy = Math.round(todayEnergy * 19.3);
  const yearEnergy = Math.round(todayEnergy * 142);
  const lifetimeEnergy = Math.round(todayEnergy * 710);
  const co2Offset = Math.round(todayEnergy * 0.585);
  const estimatedSavings = Math.round(todayEnergy * 0.42);
  const batteryLevel = Math.max(30, Math.min(96, Math.round(panel.efficiency - 6)));
  const gridExport = Math.max(0, currentOutput - 11.8);
  const humidity = sensor?.humidity_pct;
  const cloudCover = sensor?.cloud_cover_pct;
  const rainfall = sensor?.rainfall_mm;

  return {
    ambientTemperature,
    batteryLevel,
    co2Offset,
    current,
    currentOutput,
    estimatedSavings,
    gridExport,
    humidity,
    irradiance,
    lifetimeEnergy,
    monthEnergy,
    panelTemperature,
    peakPower,
    performanceRatio,
    todayEnergy,
    voltage,
    windSpeed,
    yearEnergy,
    cloudCover,
    rainfall,
  };
};

type PanelManagementPageProps = {
  panels: RuntimePanel[];
  cleaningIds: Set<string>;
  scenarioId: ScenarioId;
  selectedId: string;
  onPanelSelected: (id: string) => void;
  onClean: (id: string) => void;
};

function StatusBadge({ panel }: { panel: RuntimePanel }) {
  const statusUi = getPanelAutomationUi(panel);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold ${statusUi.badgeClass}`}
    >
      <span className={`size-1.5 rounded-full ${statusUi.dotClass}`} />
      {statusUi.shortLabel}
    </span>
  );
}

function MetricsGrid({
  totalOutputKw,
  avgSufficiency,
  activeCount,
  totalCount,
  needClean,
}: {
  totalOutputKw: number;
  avgSufficiency: number;
  activeCount: number;
  totalCount: number;
  needClean: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#f5f5f5] bg-white shadow-[0_1px_2px_rgba(10,13,18,0.05)]">
      <div className="grid grid-cols-2 border-b border-[#f5f5f5]">
        <div className="border-r border-[#f5f5f5] p-5">
          <p className="text-sm font-medium text-[#535862]">Current Output</p>
          <div className="mt-2 flex items-end gap-1">
            <p className="text-[30px] font-semibold leading-[38px] text-[#181d27]">{totalOutputKw.toFixed(1)}</p>
            <p className="mb-0.5 text-sm font-medium text-[#535862]">kW</p>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm font-medium text-[#535862]">Average Efficiency</p>
          <div className="mt-2 flex items-end gap-1">
            <p className="text-[30px] font-semibold leading-[38px] text-[#181d27]">{avgSufficiency}</p>
            <p className="mb-0.5 text-xl font-medium text-[#535862]">%</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2">
        <div className="border-r border-[#f5f5f5] p-5">
          <p className="text-sm font-medium text-[#535862]">Active Blocks</p>
          <p className="mt-2 text-[30px] font-semibold leading-[38px] text-[#181d27]">
            <span>{activeCount}</span>
            <span className="text-xl font-medium text-[#535862]">/{totalCount}</span>
          </p>
        </div>
        <div className="p-5">
          <p className="text-sm font-medium text-[#535862]">Blocks Needing Cleaning</p>
          <p className="mt-2 text-[30px] font-semibold leading-[38px] text-[#181d27]">
            <span>{needClean}</span>
            <span className="text-xl font-medium text-[#535862]">/{totalCount}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailMetricCard({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint: string;
  tone?: "neutral" | "warning" | "danger" | "success" | "blue";
}) {
  const toneClasses = {
    neutral: "text-[#181d27]",
    warning: "text-[#dc6803]",
    danger: "text-[#0369a1]",
    success: "text-[#067647]",
    blue: "text-[#2563eb]",
  };

  return (
    <div className="min-h-[118px] rounded-xl border border-[#e9eaeb] bg-white p-4 shadow-[0_1px_2px_rgba(10,13,18,0.04)]">
      <p className="text-[12px] font-semibold text-[#667085]">{label}</p>
      <div className="mt-2 flex items-end gap-1">
        <p className={`text-[26px] font-semibold leading-8 ${toneClasses[tone]}`}>{value}</p>
        {unit ? <p className="pb-0.5 text-sm font-medium text-[#535862]">{unit}</p> : null}
      </div>
      <p className="mt-2 text-xs leading-4 text-[#717680]">{hint}</p>
    </div>
  );
}

function BatteryProgressStrip({ panel }: { panel: RuntimePanel }) {
  const { batteryLevel: level } = getPanelTelemetry(panel);
  const tone = level >= 70 ? "bg-[#17b26a]" : level >= 40 ? "bg-[#f79009]" : "bg-[#f04438]";

  return (
    <div className="rounded-xl border border-[#e9eaeb] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(10,13,18,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#181d27]">Battery level</p>
        <p className="text-xl font-semibold leading-7 text-[#181d27]">{level}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f5f5f5]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${level}%` }} />
      </div>
    </div>
  );
}

function AutoCleaningScheduleCard({
  panel,
  cleaning,
  onClean,
}: {
  panel: RuntimePanel;
  cleaning: boolean;
  onClean: (id: string) => void;
}) {
  const plan = getAutoCleaningPlan(panel);
  const canClean = isPanelDirty(panel);
  const toneClasses = {
    success: {
      window: "border-[#abefc6] bg-[#ecfdf3]",
      text: "text-[#067647]",
    },
    warning: {
      window: "border-[#fedf89] bg-[#fffaeb]",
      text: "text-[#b54708]",
    },
    info: {
      window: "border-[#bae6fd] bg-[#f0f9ff]",
      text: "text-[#0369a1]",
    },
    neutral: {
      window: "border-[#e9eaeb] bg-[#fafafa]",
      text: "text-[#535862]",
    },
  }[plan.tone];

  return (
    <section className="rounded-xl border border-[#e9eaeb] bg-white p-4 shadow-[0_1px_2px_rgba(10,13,18,0.04)]">
      <div>
        <div>
          <h2 className="text-lg font-semibold leading-7 text-[#181d27]">{plan.title}</h2>
        </div>
      </div>

      <div className={`mt-4 rounded-lg border p-3 ${toneClasses.window}`}>
        <p className="text-xs font-medium text-[#717680]">Start window</p>
        <p className={`mt-1 text-2xl font-semibold leading-8 ${toneClasses.text}`}>{plan.startWindow}</p>
      </div>

      {plan.detailRows.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-3">
          {plan.detailRows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-medium text-[#717680]">{row.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#181d27]">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {plan.note ? <p className="mt-3 text-sm leading-5 text-[#535862]">{plan.note}</p> : null}

      {canClean ? (
        <button
          type="button"
          onClick={() => onClean(panel.id)}
          disabled={cleaning}
          className="mt-4 w-full rounded-lg bg-[#17b26a] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0ea05f] disabled:cursor-not-allowed disabled:bg-[#6ee7b7]"
        >
          {cleaning ? "Cleaning..." : "Clean now"}
        </button>
      ) : null}
    </section>
  );
}

function DetailMetricsGrid({ panel }: { panel: RuntimePanel }) {
  const telemetry = getPanelTelemetry(panel);
  const outputUnit = panel.backendSensor ? "kWh" : "kW";

  return (
    <div className="grid grid-cols-2 gap-3">
      <DetailMetricCard label="Latest Output" value={telemetry.currentOutput.toFixed(1)} unit={outputUnit} hint={panel.backendSensor ? "Backend demo sensor row" : "Estimated block output"} tone="blue" />
      <DetailMetricCard label="Electrical Load" value={`${telemetry.voltage} V`} hint={`${telemetry.current} A current draw`} tone="neutral" />
      <DetailMetricCard label="Panel Temp" value={telemetry.panelTemperature} unit="°C" hint={`${telemetry.ambientTemperature} °C ambient`} tone={telemetry.panelTemperature > 48 ? "warning" : "neutral"} />
      <DetailMetricCard label="Efficiency" value={panel.efficiency} unit="%" hint="Compared with expected output" tone={panel.efficiency > 90 ? "success" : "warning"} />
      <DetailMetricCard label="Saved Today" value={formatRM(telemetry.estimatedSavings)} hint="Estimated value generated today" tone="success" />
      <DetailMetricCard label="Loss Today" value={formatRM(panel.lossToday)} hint="Covered by auto-clean dispatch" tone={panel.lossToday > 0 ? "blue" : "success"} />
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e9eaeb] bg-white p-4 shadow-[0_1px_2px_rgba(10,13,18,0.04)]">
      <h2 className="text-sm font-semibold text-[#181d27]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function KeyValueGrid({ items }: { items: Array<{ label: string; value: string; tone?: "default" | "success" | "warning" | "danger" }> }) {
  const toneClasses = {
    default: "text-[#181d27]",
    success: "text-[#067647]",
    warning: "text-[#b54708]",
    danger: "text-[#0369a1]",
  };

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="truncate text-xs font-medium text-[#717680]">{item.label}</dt>
          <dd className={`mt-0.5 break-words text-sm font-semibold leading-5 ${toneClasses[item.tone ?? "default"]}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PanelOperationsSummary({ panel }: { panel: RuntimePanel }) {
  const telemetry = getPanelTelemetry(panel);
  const status = getOperationalStatus(panel);
  const inverterStatus = status === "Active" ? "Online" : status === "Fault" ? "Derated" : "Offline";
  const gridFlowTone = telemetry.gridExport > 0 ? "success" : "warning";
  const weatherRows = panel.weatherRows ?? [];
  const weather =
    weatherRows.length === 0
      ? "Weather unavailable"
      : (telemetry.rainfall ?? 0) > 0
        ? "Rain"
        : (telemetry.cloudCover ?? 0) > 60
          ? "Cloudy"
          : "Clear";
  const maintenanceDue = getPriorityLabel(panel) === "High" ? "Auto-clean queued" : isPanelDirty(panel) ? "Scheduled this week" : "Standby";
  const latestAlert =
    status === "Active"
      ? "Output within expected range"
      : panel.classifier.type === "Dust"
        ? "Output drop despite stable irradiance"
        : "Weather-adjusted output dip";
  const classifierSummary = `${panel.classifier.type} (${Math.round(panel.classifier.confidence)}%)`;

  return (
    <div className="space-y-3">
      <DetailSection title="Production Summary">
        <KeyValueGrid
          items={[
            { label: "Energy today", value: `${telemetry.todayEnergy.toLocaleString("en-MY")} kWh` },
            { label: "Peak today", value: `${telemetry.peakPower.toFixed(1)} kW` },
            { label: "This month", value: `${telemetry.monthEnergy.toLocaleString("en-MY")} kWh` },
            { label: "This year", value: `${Math.round(telemetry.yearEnergy / 1000).toLocaleString("en-MY")} MWh` },
            { label: "Lifetime", value: `${Math.round(telemetry.lifetimeEnergy / 1000).toLocaleString("en-MY")} MWh` },
          ]}
        />
      </DetailSection>

      <DetailSection title="Environment">
        <KeyValueGrid
          items={[
            { label: "Irradiance", value: `${telemetry.irradiance} W/m²` },
            { label: "Weather", value: weather },
            { label: "Air temp", value: `${telemetry.ambientTemperature} °C` },
            { label: "Humidity", value: telemetry.humidity === undefined ? "Unavailable" : `${Math.round(telemetry.humidity)}%` },
          ]}
        />
      </DetailSection>

      <DetailSection title="System & Analytics">
        <KeyValueGrid
          items={[
            { label: "Inverter", value: inverterStatus, tone: status === "Active" ? "success" : "warning" },
            { label: "Grid flow", value: `Export ${telemetry.gridExport.toFixed(1)} kW`, tone: gridFlowTone },
            { label: "PR", value: telemetry.performanceRatio.toFixed(2), tone: telemetry.performanceRatio > 0.78 ? "success" : "warning" },
            { label: "CO₂ offset", value: `${telemetry.co2Offset} kg` },
          ]}
        />
      </DetailSection>

      <DetailSection title="Health & Asset Info">
        <KeyValueGrid
          items={[
            { label: "Latest alert", value: latestAlert, tone: status === "Active" ? "success" : "warning" },
            { label: "Classifier", value: classifierSummary, tone: panel.classifier.type === "Dust" ? "warning" : panel.classifier.type === "Weather" ? "default" : "success" },
            { label: "Cause", value: panel.classifier.cause },
            { label: "Maintenance", value: maintenanceDue, tone: maintenanceDue === "Auto-clean queued" ? "danger" : "default" },
            { label: "Module", value: PANEL_SPECS.module },
            { label: "Capacity", value: PANEL_SPECS.capacity },
            { label: "Inverter model", value: PANEL_SPECS.inverter },
            { label: "Installed", value: PANEL_SPECS.installed },
            { label: "Coordinate", value: PANEL_SPECS.location },
          ]}
        />
      </DetailSection>
    </div>
  );
}

export function PanelManagementPage({ panels, cleaningIds, scenarioId, selectedId, onPanelSelected, onClean }: PanelManagementPageProps) {
  const [detailPanelId, setDetailPanelId] = useState<string | null>(null);

  const detailPanel = detailPanelId ? (panels.find((p) => p.id === detailPanelId) ?? null) : null;

  const totalOutputKw = panels.reduce((s, p) => s + (p.efficiency / 100) * PANEL_RATED_KW, 0);
  const avgSufficiency = Math.round(panels.reduce((s, p) => s + p.efficiency, 0) / panels.length);
  const activeCount = panels.filter((p) => p.efficiency > 20).length;
  const needClean = panels.filter(isPanelDirty).length;

  const metricsProps = { totalOutputKw, avgSufficiency, activeCount, totalCount: panels.length, needClean };
  const selectPanel = (id: string) => {
    setDetailPanelId(id);
    onPanelSelected(id);
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Middle pane */}
      <div className="flex h-full min-h-0 w-[500px] shrink-0 flex-col gap-6 overflow-y-auto overscroll-contain border-r border-[#e9eaeb] bg-[#fafafa] p-8">
        {detailPanel ? (
          // ── Panel block detail view ────────────────────────────────────────
          <>
            <div>
              <button
                type="button"
                onClick={() => setDetailPanelId(null)}
                className="flex items-center gap-1.5 rounded-xl border border-[#e9eaeb] bg-white px-3 py-2.5 text-sm font-semibold text-[#181d27] shadow-sm hover:bg-[#f5f5f5]"
              >
                <svg className="size-5 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-[#181d27]">Panel Block {detailPanel.id}</h1>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-base text-[#535862]">ID {detailPanel.id}-PV-04</span>
                  <span className="size-1.5 rounded-full bg-[#535862]" />
                  <span className="text-base text-[#535862]">Farm A</span>
                </div>
              </div>
              <StatusBadge panel={detailPanel} />
            </div>

            <AutoCleaningScheduleCard
              panel={detailPanel}
              cleaning={cleaningIds.has(detailPanel.id)}
              onClean={onClean}
            />

            <BatteryProgressStrip panel={detailPanel} />

            <DetailMetricsGrid panel={detailPanel} />

            <PanelOperationsSummary panel={detailPanel} />

            <div className="shrink-0">
              <EnergyTimelineChart panel={detailPanel} scenario={scenarioId} />
            </div>
          </>
        ) : (
          // ── Panel block monitoring overview ────────────────────────────────
          <>
            <div>
              <h1 className="text-xl font-semibold text-[#181d27]">Panel Block Monitoring</h1>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-base text-[#535862]">Selangor, Malaysia</span>
                <span className="size-1.5 rounded-full bg-[#535862]" />
                <span className="text-base text-[#535862]">Farm A</span>
              </div>
            </div>

            <MetricsGrid {...metricsProps} />

            <div className="rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(10,13,18,0.05)] ring-1 ring-[#f5f5f5]">
              <h2 className="text-lg font-semibold text-[#181d27]">Panel Blocks</h2>

              <div className="mt-3 grid grid-cols-[52px_minmax(108px,1fr)_92px_124px] gap-3 border-b border-[#e9eaeb] pb-3">
                {["Block", "Output", "Efficiency", "Status"].map((h) => (
                  <p key={h} className="whitespace-nowrap text-sm text-[#717680]">
                    {h}
                  </p>
                ))}
              </div>

              {panels.map((panel) => {
                const statusUi = getPanelAutomationUi(panel);
                const output = ((panel.efficiency / 100) * PANEL_RATED_KW).toFixed(1);

                return (
                  <button
                    key={panel.id}
                    type="button"
                    onClick={() => selectPanel(panel.id)}
                    className="-mx-1 grid w-[calc(100%+8px)] cursor-pointer grid-cols-[52px_minmax(108px,1fr)_92px_124px] gap-3 rounded-lg border-b border-[#e9eaeb] px-1 py-3 text-left last:border-0 hover:bg-[#fafafa]"
                  >
                    <p className="text-sm text-[#181d27]">{panel.id}</p>
                    <p className="whitespace-nowrap text-sm text-[#181d27]">{output} kW</p>
                    <p className="whitespace-nowrap text-sm text-[#181d27]">{panel.efficiency}%</p>
                    <span
                      className={`inline-flex w-fit items-center gap-1.5 self-start justify-self-start whitespace-nowrap rounded-xl border px-2 py-1 text-xs font-semibold ${statusUi.badgeClass}`}
                    >
                      <span className={`size-1.5 rounded-full ${statusUi.dotClass}`} />
                      {statusUi.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Map */}
      <div className="min-h-0 min-w-0 flex-1">
        <FarmOperationsMap panels={panels} selectedId={detailPanelId ?? selectedId} onSelect={selectPanel} />
      </div>
    </div>
  );
}
