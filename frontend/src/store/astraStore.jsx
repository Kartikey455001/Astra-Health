import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, EVENTS_URL } from "../services/api";
import { evaluateMetric, evaluateBehavioral, overallSeverity, METRICS } from "../utils/healthEngine";

const AstraContext = createContext(null);

const DEFAULT_ASTRONAUTS = [
  { id: "ast-1", name: "Crew Member A", role: "Commander", mission_id: "msn-artemis-demo" },
  { id: "ast-2", name: "Crew Member B", role: "Flight Engineer", mission_id: "msn-artemis-demo" },
  { id: "ast-3", name: "Crew Member C", role: "Mission Specialist", mission_id: "msn-artemis-demo" },
  { id: "ast-4", name: "Crew Member D", role: "Payload Specialist", mission_id: "msn-artemis-demo" }
];

export function AstraProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [astronauts, setAstronauts] = useState(DEFAULT_ASTRONAUTS);
  const [selectedAstro, setSelectedAstro] = useState("ast-1");
  const [vitals, setVitals] = useState([]);
  const [baselines, setBaselines] = useState([]);
  const [sleepLogs, setSleepLogs] = useState([]);
  const [moodLogs, setMoodLogs] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [radiationEvents, setRadiationEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donkiLoading, setDonkiLoading] = useState(false);
  const [donkiSummary, setDonkiSummary] = useState("Not fetched yet.");
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch full state from server or local backup
  const refreshState = useCallback(async () => {
    try {
      const res = await api.getState();
      if (res && res.state) {
        const s = res.state;
        if (s.astronauts?.length) setAstronauts(s.astronauts);
        setVitals(s.vital_readings || []);
        setBaselines(s.health_baselines || []);
        setSleepLogs(s.sleep_logs || []);
        setMoodLogs(s.mood_logs || []);
        setExerciseLogs(s.exercise_logs || []);
        setRadiationEvents(s.radiation_events || []);
        setAlerts(s.alerts || []);
        setSyncLogs(s.sync_logs || []);
        localStorage.setItem("astra_cached_state", JSON.stringify(s));
      }
    } catch (e) {
      // Offline fallback: load from localStorage
      const cached = localStorage.getItem("astra_cached_state");
      if (cached) {
        try {
          const s = JSON.parse(cached);
          if (s.astronauts?.length) setAstronauts(s.astronauts);
          setVitals(s.vital_readings || []);
          setBaselines(s.health_baselines || []);
          setSleepLogs(s.sleep_logs || []);
          setMoodLogs(s.mood_logs || []);
          setExerciseLogs(s.exercise_logs || []);
          setRadiationEvents(s.radiation_events || []);
          setAlerts(s.alerts || []);
          setSyncLogs(s.sync_logs || []);
        } catch (err) {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Connect to SSE stream for real-time live events
  useEffect(() => {
    let eventSource = null;
    try {
      eventSource = new EventSource(EVENTS_URL);
      eventSource.onmessage = () => {
        refreshState();
      };
      eventSource.addEventListener("vital_added", () => refreshState());
      eventSource.addEventListener("alert_created", () => refreshState());
      eventSource.addEventListener("telemetry_update", () => refreshState());
    } catch (e) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [refreshState]);

  // Trigger live simulation tick
  const simulateTick = async () => {
    try {
      await api.simulateTick();
      await refreshState();
    } catch (e) {
      // Local tick if server is offline
      const now = new Date().toISOString();
      const updatedVitals = [...vitals];
      astronauts.forEach(a => {
        const b = baselines.find(x => x.astronaut_id === a.id && x.metric === "heart_rate")?.baseline_value || 68;
        const drift = a.id === "ast-1" ? 24 : 0;
        const jitter = (Math.random() - 0.5) * 4;
        updatedVitals.push({
          id: `vit-local-${Date.now()}-${a.id}`,
          astronaut_id: a.id,
          metric: "heart_rate",
          value: Math.round((b + drift + jitter) * 10) / 10,
          unit: "BPM",
          recorded_at: now,
          data_origin: "SIMULATED",
          quality_status: "validated"
        });
      });
      setVitals(updatedVitals);
    }
  };

  // Fetch DONKI events
  const fetchDonki = async (type = "SEP") => {
    setDonkiLoading(true);
    setDonkiSummary(`Fetching ${type} events from NASA DONKI…`);
    try {
      const res = await api.getDonkiEvents(type);
      if (res.data) {
        setRadiationEvents(res.data);
        setDonkiSummary(`Live fetch complete — ${res.count} event(s), retrieved ${new Date().toLocaleTimeString()}.`);
      }
    } catch (err) {
      setDonkiSummary(`Fetch failed: ${err.message}. Showing cached space weather context.`);
    } finally {
      setDonkiLoading(false);
      setLastSyncTime(new Date().toLocaleTimeString());
    }
  };

  // Add a vital reading
  const addVital = async (vitalData) => {
    const res = await api.addVital(vitalData);
    await refreshState();
    return res;
  };

  // Submit check-in
  const addCheckin = async ({ sleep, mood, exercise }) => {
    if (sleep) await api.logSleep(sleep);
    if (mood) await api.logMood(mood);
    if (exercise) await api.logExercise(exercise);
    await refreshState();
  };

  // Reset demo
  const resetDemo = async () => {
    try {
      await api.resetState();
      await refreshState();
    } catch (e) {
      localStorage.removeItem("astra_cached_state");
      window.location.reload();
    }
  };

  // Evaluate single astronaut
  const evaluateCrewMember = useCallback((astronautId) => {
    const astroVitals = vitals.filter(v => v.astronaut_id === astronautId);
    const evals = Object.keys(METRICS).map(m => {
      const metricVitals = astroVitals.filter(v => v.metric === m);
      const b = baselines.find(x => x.astronaut_id === astronautId && x.metric === m)?.baseline_value || METRICS[m].baseline;
      return evaluateMetric(m, metricVitals, b, Date.now());
    });

    const astroSleeps = sleepLogs.filter(s => s.astronaut_id === astronautId);
    const astroMoods = moodLogs.filter(m => m.astronaut_id === astronautId);
    const behavioral = evaluateBehavioral(astroSleeps, astroMoods);

    const overall = overallSeverity([...evals, behavioral]);

    return {
      astronautId,
      overall,
      evals,
      behavioral
    };
  }, [vitals, baselines, sleepLogs, moodLogs]);

  return (
    <AstraContext.Provider
      value={{
        isOnline,
        astronauts,
        selectedAstro,
        setSelectedAstro,
        vitals,
        baselines,
        sleepLogs,
        moodLogs,
        exerciseLogs,
        radiationEvents,
        alerts,
        syncLogs,
        loading,
        donkiLoading,
        donkiSummary,
        lastSyncTime,
        refreshState,
        simulateTick,
        fetchDonki,
        addVital,
        addCheckin,
        resetDemo,
        evaluateCrewMember
      }}
    >
      {children}
    </AstraContext.Provider>
  );
}

export function useAstra() {
  const context = useContext(AstraContext);
  if (!context) {
    throw new Error("useAstra must be used within an AstraProvider");
  }
  return context;
}

