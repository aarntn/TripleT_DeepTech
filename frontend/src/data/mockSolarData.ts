export type ScenarioId = "dusty" | "rainy";
export type PanelId = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type PanelStatus = "Clean" | "Dust suspected" | "Heavy loss";
export type ClassificationType = "Dust" | "Weather" | "Normal";

export type TimelinePoint = {
  day: string;
  expected: number;
  actual: number;
  efficiency: number;
  weather: string;
  irradiance: number;
  revenueLoss: number;
  event?: string;
};

export type ForecastPoint = {
  day: string;
  expected: number;
  forecast: number;
};

export type ClassifierResult = {
  type: ClassificationType;
  confidence: number;
  cause: string;
};

export type PanelArray = {
  id: PanelId;
  name: string;
  baseEfficiency: number;
  baseLossToday: number;
  lossThisWeek: number;
  savedIfCleaned: number;
  classifier: ClassifierResult;
  timeline: TimelinePoint[];
  forecast: ForecastPoint[];
};

export type Scenario = {
  id: ScenarioId;
  label: string;
  summary: string;
  panels: PanelArray[];
};

const dustyTimeline = (
  actuals: number[],
  event = "Dust drop",
): TimelinePoint[] => {
  const expected = [610, 616, 620, 618, 622, 625, 628];
  const weather = ["Clear", "Clear", "Clear", "Clear", "Clear", "Hazy", "Clear"];
  const irradiance = [5.1, 5.2, 5.2, 5.1, 5.2, 5.0, 5.2];

  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => ({
    day,
    expected: expected[index],
    actual: actuals[index],
    efficiency: Math.round((actuals[index] / expected[index]) * 100),
    weather: weather[index],
    irradiance: irradiance[index],
    revenueLoss: Math.max(0, Math.round((expected[index] - actuals[index]) * 0.42)),
    event: day === "Thu" ? event : undefined,
  }));
};

const rainyTimeline = (actuals: number[], event = "Rainy Tuesday"): TimelinePoint[] => {
  const expected = [604, 610, 615, 612, 618, 622, 624];
  const weather = ["Cloudy", "Rain", "Rain", "Cloudy", "Clear", "Clear", "Clear"];
  const irradiance = [4.4, 2.8, 3.1, 4.0, 5.0, 5.2, 5.1];

  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => ({
    day,
    expected: expected[index],
    actual: actuals[index],
    efficiency: Math.round((actuals[index] / expected[index]) * 100),
    weather: weather[index],
    irradiance: irradiance[index],
    revenueLoss: Math.max(0, Math.round((expected[index] - actuals[index]) * 0.42)),
    event: day === "Tue" ? event : undefined,
  }));
};

export const scenarios: Record<ScenarioId, Scenario> = {
  dusty: {
    id: "dusty",
    label: "Dusty week - Farm A",
    summary: "Stable sun, declining output, dust-led losses.",
    panels: [
      {
        id: "A1",
        name: "Array A1",
        baseEfficiency: 68,
        baseLossToday: 480,
        lossThisWeek: 2860,
        savedIfCleaned: 2420,
        classifier: {
          type: "Dust",
          confidence: 91,
          cause: "Output dropped despite stable irradiance and no recent rainfall.",
        },
        timeline: dustyTimeline([594, 575, 548, 492, 468, 438, 427]),
        forecast: [
          { day: "Mon +1", expected: 630, forecast: 414 },
          { day: "Tue +2", expected: 632, forecast: 402 },
          { day: "Wed +3", expected: 635, forecast: 389 },
        ],
      },
      {
        id: "A2",
        name: "Array A2",
        baseEfficiency: 96,
        baseLossToday: 24,
        lossThisWeek: 120,
        savedIfCleaned: 0,
        classifier: {
          type: "Normal",
          confidence: 94,
          cause: "Actual output tracks expected output within normal tolerance.",
        },
        timeline: dustyTimeline([599, 604, 612, 607, 614, 615, 621], "Normal range"),
        forecast: [
          { day: "Mon +1", expected: 630, forecast: 622 },
          { day: "Tue +2", expected: 632, forecast: 624 },
          { day: "Wed +3", expected: 635, forecast: 626 },
        ],
      },
      {
        id: "B1",
        name: "Array B1",
        baseEfficiency: 82,
        baseLossToday: 260,
        lossThisWeek: 1460,
        savedIfCleaned: 1180,
        classifier: {
          type: "Dust",
          confidence: 84,
          cause: "Mild output decay appears while irradiance remains steady.",
        },
        timeline: dustyTimeline([586, 574, 552, 525, 512, 506, 498]),
        forecast: [
          { day: "Mon +1", expected: 630, forecast: 488 },
          { day: "Tue +2", expected: 632, forecast: 478 },
          { day: "Wed +3", expected: 635, forecast: 466 },
        ],
      },
      {
        id: "B2",
        name: "Array B2",
        baseEfficiency: 54,
        baseLossToday: 690,
        lossThisWeek: 4210,
        savedIfCleaned: 3680,
        classifier: {
          type: "Dust",
          confidence: 96,
          cause: "Large sustained loss with clear sky readings indicates heavy soiling.",
        },
        timeline: dustyTimeline([566, 520, 475, 414, 372, 344, 338]),
        forecast: [
          { day: "Mon +1", expected: 630, forecast: 326 },
          { day: "Tue +2", expected: 632, forecast: 316 },
          { day: "Wed +3", expected: 635, forecast: 304 },
        ],
      },
      {
        id: "C1",
        name: "Array C1",
        baseEfficiency: 74,
        baseLossToday: 210,
        lossThisWeek: 1120,
        savedIfCleaned: 260,
        classifier: {
          type: "Weather",
          confidence: 88,
          cause: "Loss aligns with localized cloud cover and lower irradiance.",
        },
        timeline: dustyTimeline([588, 566, 548, 510, 506, 486, 462], "Cloud band"),
        forecast: [
          { day: "Mon +1", expected: 630, forecast: 540 },
          { day: "Tue +2", expected: 632, forecast: 566 },
          { day: "Wed +3", expected: 635, forecast: 588 },
        ],
      },
      {
        id: "C2",
        name: "Array C2",
        baseEfficiency: 93,
        baseLossToday: 38,
        lossThisWeek: 180,
        savedIfCleaned: 0,
        classifier: {
          type: "Normal",
          confidence: 92,
          cause: "Performance remains within expected operating range.",
        },
        timeline: dustyTimeline([602, 600, 608, 604, 610, 616, 614], "Normal range"),
        forecast: [
          { day: "Mon +1", expected: 630, forecast: 617 },
          { day: "Tue +2", expected: 632, forecast: 620 },
          { day: "Wed +3", expected: 635, forecast: 622 },
        ],
      },
    ],
  },
  rainy: {
    id: "rainy",
    label: "Rainy week - Farm A",
    summary: "Rain and cloud cover explain most production drops.",
    panels: [
      {
        id: "A1",
        name: "Array A1",
        baseEfficiency: 79,
        baseLossToday: 190,
        lossThisWeek: 980,
        savedIfCleaned: 180,
        classifier: {
          type: "Weather",
          confidence: 89,
          cause: "Output dip coincides with rainfall and lower irradiance.",
        },
        timeline: rainyTimeline([548, 402, 432, 510, 590, 604, 610]),
        forecast: [
          { day: "Mon +1", expected: 627, forecast: 602 },
          { day: "Tue +2", expected: 631, forecast: 614 },
          { day: "Wed +3", expected: 634, forecast: 620 },
        ],
      },
      {
        id: "A2",
        name: "Array A2",
        baseEfficiency: 95,
        baseLossToday: 34,
        lossThisWeek: 160,
        savedIfCleaned: 0,
        classifier: {
          type: "Normal",
          confidence: 93,
          cause: "Array recovered after rain and matches expected output.",
        },
        timeline: rainyTimeline([586, 470, 492, 560, 600, 614, 616]),
        forecast: [
          { day: "Mon +1", expected: 627, forecast: 618 },
          { day: "Tue +2", expected: 631, forecast: 622 },
          { day: "Wed +3", expected: 634, forecast: 626 },
        ],
      },
      {
        id: "B1",
        name: "Array B1",
        baseEfficiency: 84,
        baseLossToday: 150,
        lossThisWeek: 820,
        savedIfCleaned: 420,
        classifier: {
          type: "Dust",
          confidence: 74,
          cause: "Some residual loss remains after rainfall, suggesting light soiling.",
        },
        timeline: rainyTimeline([552, 430, 458, 522, 548, 532, 524]),
        forecast: [
          { day: "Mon +1", expected: 627, forecast: 512 },
          { day: "Tue +2", expected: 631, forecast: 508 },
          { day: "Wed +3", expected: 634, forecast: 502 },
        ],
      },
      {
        id: "B2",
        name: "Array B2",
        baseEfficiency: 71,
        baseLossToday: 330,
        lossThisWeek: 1880,
        savedIfCleaned: 1460,
        classifier: {
          type: "Dust",
          confidence: 82,
          cause: "Even after rain clears, output remains below peers.",
        },
        timeline: rainyTimeline([530, 398, 420, 488, 466, 452, 444]),
        forecast: [
          { day: "Mon +1", expected: 627, forecast: 432 },
          { day: "Tue +2", expected: 631, forecast: 422 },
          { day: "Wed +3", expected: 634, forecast: 412 },
        ],
      },
      {
        id: "C1",
        name: "Array C1",
        baseEfficiency: 63,
        baseLossToday: 420,
        lossThisWeek: 2260,
        savedIfCleaned: 120,
        classifier: {
          type: "Weather",
          confidence: 94,
          cause: "Sharp loss matches rain intensity and cloud cover timing.",
        },
        timeline: rainyTimeline([520, 350, 378, 462, 530, 580, 594]),
        forecast: [
          { day: "Mon +1", expected: 627, forecast: 596 },
          { day: "Tue +2", expected: 631, forecast: 608 },
          { day: "Wed +3", expected: 634, forecast: 612 },
        ],
      },
      {
        id: "C2",
        name: "Array C2",
        baseEfficiency: 94,
        baseLossToday: 42,
        lossThisWeek: 190,
        savedIfCleaned: 0,
        classifier: {
          type: "Normal",
          confidence: 91,
          cause: "The array follows the farm baseline and has no cleaning signal.",
        },
        timeline: rainyTimeline([582, 466, 488, 558, 596, 608, 612]),
        forecast: [
          { day: "Mon +1", expected: 627, forecast: 616 },
          { day: "Tue +2", expected: 631, forecast: 620 },
          { day: "Wed +3", expected: 634, forecast: 624 },
        ],
      },
    ],
  },
};

export const sensorSamples = [
  { irradiance: 5.1, panelTemp: 42, humidity: 66, wind: 5 },
  { irradiance: 5.3, panelTemp: 44, humidity: 63, wind: 4 },
  { irradiance: 4.9, panelTemp: 40, humidity: 70, wind: 6 },
  { irradiance: 5.2, panelTemp: 43, humidity: 64, wind: 5 },
];

export const getPanelStatus = (efficiency: number): PanelStatus => {
  if (efficiency > 90) return "Clean";
  if (efficiency >= 60) return "Dust suspected";
  return "Heavy loss";
};
