export interface HealthResponse {
  status: string;
  service: string;
}

export interface SensorReading {
  array_id: string;
  timestamp: string;
  irradiance_kwh_m2: number;
  temp_c: number;
  humidity_pct: number;
  cloud_cover_pct: number;
  rainfall_mm: number;
  actual_output_kwh: number;
  expected_output_kwh: number;
  efficiency_pct: number;
  soiling_loss_pct: number;
  dust_flag: number;
  rain_event: boolean;
}

export interface ClassifyRequest {
  array_id: string;
  efficiency_pct: number;
  irradiance_kwh_m2: number;
  cloud_cover_pct: number;
  humidity_pct: number;
  rainfall_mm: number;
  soiling_loss_pct: number;
}

export interface ClassifyResponse {
  type: "dust" | "weather" | "normal" | string;
  confidence: number;
  cause: string;
}

export interface ForecastPoint {
  date: string;
  forecast_efficiency_pct: number;
  forecast_revenue_rm: number;
  lower_bound: number;
  upper_bound: number;
}

export interface WeatherPoint {
  timestamp: string;
  array_id: string;
  irradiance_kwh_m2: number;
  temp_c: number;
  humidity_pct: number;
  cloud_cover_pct: number;
  rainfall_mm: number;
  source: string;
}

export interface ROIRequest {
  mw: number;
  location: "malaysia" | "gcc";
  tariff_rm_per_kwh: number;
  hormuz: boolean;
}

export interface MonthlyRow {
  month: string;
  eff_with: number;
  eff_without: number;
  kwh_recovered: number;
  rm_recovered: number;
  carbon_value_rm: number;
}

export interface CumulativeRow {
  year: string;
  system_cost_k: number;
  cum_savings_k: number;
}

export interface ROIResponse {
  annual_kwh_recovered: number;
  annual_revenue_rm: number;
  annual_carbon_rm: number;
  system_cost_rm: number;
  annual_om_rm: number;
  annual_net_rm: number;
  payback_years: number;
  npv_rm: number;
  monthly: MonthlyRow[];
  cumulative: CumulativeRow[];
}

export interface HormuzResponse {
  tariff_multiplier: number;
  scenario: string;
  source_note: string;
}

export class ApiError extends Error {
  status: number;
  requestId?: string;
  detail?: any;

  constructor(message: string, status: number, requestId?: string, detail?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
    this.detail = detail;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const API_KEY = import.meta.env.VITE_SOLARGUARD_API_KEY || "dev-local-key";

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${API_KEY}`);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(id);

    const requestId = response.headers.get("X-Request-ID") || undefined;

    if (!response.ok) {
      let detail;
      try {
        const errorData = await response.json();
        detail = errorData.detail;
      } catch {
        // Not JSON
      }

      throw new ApiError(
        detail || `API request failed with status ${response.status}`,
        response.status,
        requestId,
        detail
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new ApiError("Request timed out", 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || "Network connection failed", 0);
  }
}

export const api = {
  getHealth: () => apiFetch<HealthResponse>("/"),
  getLatestSensors: () => apiFetch<SensorReading[]>("/api/sensor/latest"),
  getSensorHistory: () => apiFetch<SensorReading[]>("/api/sensor/history"),
  classifySensor: (data: ClassifyRequest) =>
    apiFetch<ClassifyResponse>("/api/sensor/classify", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getForecast: (arrayId: string) => apiFetch<ForecastPoint[]>(`/api/forecast/${arrayId}`),
  getWeatherForecast: (arrayId: string) =>
    apiFetch<WeatherPoint[]>(`/api/weather/forecast/${arrayId}`),
  calculateROI: (data: ROIRequest) =>
    apiFetch<ROIResponse>("/api/roi/calculate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getHormuz: () => apiFetch<HormuzResponse>("/api/market/hormuz"),
};
