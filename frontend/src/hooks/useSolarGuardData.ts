import { useState, useEffect, useCallback } from "react";
import { api, SensorReading, ClassifyResponse, ForecastPoint, WeatherPoint, ApiError } from "../lib/api";
import { scenarios, ScenarioId, PanelId, type ClassificationType } from "../data/mockSolarData";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export type DataSource = "backend" | "mock" | "fallback" | "error";

export type UiClassification = {
  type: ClassificationType;
  confidence: number;
  cause: string;
};

export interface SolarGuardState {
  sensors: SensorReading[];
  classification: Record<string, UiClassification>;
  forecasts: Record<string, ForecastPoint[]>;
  weather: Record<string, WeatherPoint[]>;
  histories: Record<string, SensorReading[]>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  source: DataSource;
  lastUpdated: Date | null;
}

export function useSolarGuardData(selectedScenarioId: ScenarioId, selectedArrayId: PanelId) {
  const [state, setState] = useState<SolarGuardState>({
    sensors: [],
    classification: {},
    forecasts: {},
    weather: {},
    histories: {},
    loading: true,
    refreshing: false,
    error: null,
    source: "mock",
    lastUpdated: null,
  });

  const normalizeClassification = (result: ClassifyResponse): UiClassification => {
    const normalizedType = result.type.toLowerCase();
    const type: ClassificationType =
      normalizedType === "dust" ? "Dust" : normalizedType === "weather" ? "Weather" : "Normal";
    const confidence = result.confidence <= 1 ? Math.round(result.confidence * 100) : Math.round(result.confidence);

    return {
      type,
      confidence,
      cause: result.cause,
    };
  };

  const groupHistoryByArray = (history: SensorReading[]) =>
    history.reduce<Record<string, SensorReading[]>>((groups, reading) => {
      if (!groups[reading.array_id]) groups[reading.array_id] = [];
      groups[reading.array_id].push(reading);
      return groups;
    }, {});

  const loadData = useCallback(async (isRefresh = false) => {
    setState(prev => ({ ...prev, refreshing: isRefresh, loading: !isRefresh, error: null }));

    try {
      // 1. Check health
      await api.getHealth();

      // 2. Load sensors
      const sensors = await api.getLatestSensors();

      // 3. Load backend CSV history for charts
      const history = await api.getSensorHistory();

      // 4. Classify all latest sensor readings
      const classificationEntries = await Promise.all(
        sensors.map(async (sensor) => {
          const result = await api.classifySensor({
            array_id: sensor.array_id,
            efficiency_pct: sensor.efficiency_pct,
            irradiance_kwh_m2: sensor.irradiance_kwh_m2,
            cloud_cover_pct: sensor.cloud_cover_pct,
            humidity_pct: sensor.humidity_pct,
            rainfall_mm: sensor.rainfall_mm,
            soiling_loss_pct: sensor.soiling_loss_pct,
          });

          return [sensor.array_id, normalizeClassification(result)] as const;
        })
      );

      // 5. Load forecast for selected array
      const forecast = await api.getForecast(selectedArrayId);

      // 6. Load weather for selected array
      const weather = await api.getWeatherForecast(selectedArrayId);

      // 7. Update state with backend data
      setState(prev => ({
        ...prev,
        sensors,
        histories: groupHistoryByArray(history),
        classification: Object.fromEntries(classificationEntries),
        forecasts: { ...prev.forecasts, [selectedArrayId]: forecast },
        weather: { ...prev.weather, [selectedArrayId]: weather },
        loading: false,
        refreshing: false,
        source: "backend",
        lastUpdated: new Date(),
      }));
    } catch (err: any) {
      console.error("Backend fetch failed:", err);
      
      if (USE_MOCKS) {
        // Fallback to mock data
        const scenario = scenarios[selectedScenarioId];
        const mockSensors: SensorReading[] = scenario.panels.map(p => ({
          array_id: p.id,
          timestamp: new Date().toISOString(),
          irradiance_kwh_m2: p.timeline[p.timeline.length - 1].irradiance,
          temp_c: 42, // Mock constant
          humidity_pct: 65, // Mock constant
          cloud_cover_pct: 20, // Mock constant
          rainfall_mm: 0, // Mock constant
          actual_output_kwh: p.timeline[p.timeline.length - 1].actual,
          expected_output_kwh: p.timeline[p.timeline.length - 1].expected,
          efficiency_pct: p.baseEfficiency,
          soiling_loss_pct: 100 - p.baseEfficiency, // Simplified
          dust_flag: p.classifier.type === "Dust" ? 1 : 0,
          rain_event: p.classifier.type === "Weather",
        }));

        setState(prev => ({
          ...prev,
          sensors: mockSensors,
          histories: {},
          loading: false,
          refreshing: false,
          source: "fallback",
          error: err instanceof ApiError ? err.message : "Backend unavailable, using mock data.",
          lastUpdated: new Date(),
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: err instanceof ApiError ? err.message : "Connection failed.",
          source: "error",
        }));
      }
    }
  }, [selectedArrayId, selectedScenarioId]);

  const classifyArray = useCallback(async (arrayId: string) => {
    const sensor = state.sensors.find(s => s.array_id === arrayId);
    if (!sensor || state.source !== "backend") return;

    try {
      const result = await api.classifySensor({
        array_id: sensor.array_id,
        efficiency_pct: sensor.efficiency_pct,
        irradiance_kwh_m2: sensor.irradiance_kwh_m2,
        cloud_cover_pct: sensor.cloud_cover_pct,
        humidity_pct: sensor.humidity_pct,
        rainfall_mm: sensor.rainfall_mm,
        soiling_loss_pct: sensor.soiling_loss_pct,
      });

      setState(prev => ({
        ...prev,
        classification: { ...prev.classification, [arrayId]: normalizeClassification(result) },
      }));
    } catch (err) {
      console.error("Classification failed:", err);
    }
  }, [state.sensors, state.source]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { ...state, refresh: () => loadData(true), classifyArray };
}
