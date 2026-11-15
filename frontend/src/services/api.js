/**
 * ASTRA HEALTH — API Service
 * Handles communication with the Node.js backend.
 * Gracefully falls back to offline local state when disconnected.
 */

const BASE_URL = "/api";

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`API call failed for ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: () => request("/health"),
  getState: () => request("/state"),
  resetState: () => request("/state/reset", { method: "POST" }),

  // Astronauts
  getAstronauts: () => request("/astronauts"),
  getAstronautStatus: (id) => request(`/astronauts/${id}`),

  // Vitals
  getVitals: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/vitals${q ? `?${q}` : ""}`);
  },
  addVital: (data) => request("/vitals", { method: "POST", body: JSON.stringify(data) }),
  simulateTick: () => request("/vitals/simulate-tick", { method: "POST" }),

  // Baselines
  getBaselines: (astronautId) => request(`/baselines${astronautId ? `?astronaut_id=${astronautId}` : ""}`),
  updateBaseline: (data) => request("/baselines", { method: "PUT", body: JSON.stringify(data) }),

  // Behavioral
  logSleep: (data) => request("/behavioral/sleep", { method: "POST", body: JSON.stringify(data) }),
  logMood: (data) => request("/behavioral/mood", { method: "POST", body: JSON.stringify(data) }),
  logExercise: (data) => request("/behavioral/exercise", { method: "POST", body: JSON.stringify(data) }),
  getBehavioralSummary: (id) => request(`/behavioral/${id}`),

  // Radiation & Space Weather
  getDonkiEvents: (type = "SEP") => request(`/radiation/donki?type=${encodeURIComponent(type)}`),
  getRadData: () => request("/radiation/rad"),
  getLsdaData: () => request("/radiation/lsda"),
  getRadiationReadings: (id) => request(`/radiation/readings${id ? `?astronaut_id=${id}` : ""}`),

  // Alerts
  getAlerts: (limit = 30) => request(`/alerts?limit=${limit}`),
  updateAlertStatus: (id, status) => request(`/alerts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // NASA Search & Sync
  searchOsdr: (term, size = 10) => request(`/nasa/osdr?term=${encodeURIComponent(term)}&size=${size}`),
  searchNtrs: (term, size = 10) => request(`/nasa/ntrs?term=${encodeURIComponent(term)}&size=${size}`),
  searchResearch: (query) => request(`/nasa/research?q=${encodeURIComponent(query)}`),
  getSyncStatus: () => request("/nasa/sync-status"),
  triggerSyncAll: () => request("/nasa/sync-all", { method: "POST" }),

  // NASA Dataset Inventory (ASTRA_HEALTH_NASA_Dataset_Inventory.csv)
  getDatasetInventory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/nasa/inventory${q ? `?${q}` : ""}`);
  },
  getDatasetById: (id) => request(`/nasa/inventory/${encodeURIComponent(id)}`),
  getBiomarkersContext: () => request("/nasa/biomarkers"),
  getRadiationInventoryContext: () => request("/nasa/radiation-context"),
  getBehavioralInventoryContext: () => request("/nasa/behavioral-context"),

  // AI Assistant
  explainHealth: (payload) => request("/assistant/explain", { method: "POST", body: JSON.stringify(payload) }),
  queryAssistant: (payload) => request("/assistant/query", { method: "POST", body: JSON.stringify(payload) }),
  getVitalTrendAi: (payload) => request("/assistant/vital-trend", { method: "POST", body: JSON.stringify(payload) }),
  getRadiationAi: (payload) => request("/assistant/radiation-assessment", { method: "POST", body: JSON.stringify(payload) }),
  getBehavioralAi: (payload) => request("/assistant/behavioral-assessment", { method: "POST", body: JSON.stringify(payload) }),
  getDailyBriefingAi: (payload) => request("/assistant/daily-briefing", { method: "POST", body: JSON.stringify(payload) }),

  // Reports
  getDailyReport: (astronautId) => request(`/reports/daily?astronaut_id=${astronautId}`)
};

