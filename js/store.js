/*
 * ASTRA HEALTH — local store (offline-first prototype persistence).
 * Blueprint phase-1 scope: records live in the browser (localStorage), the
 * offline tier of the architecture (IndexedDB/PostgreSQL are the production
 * tiers described in the README). Every record carries the blueprint's
 * required provenance fields: source_name, source_record_id, data_origin
 * (NASA_PUBLIC | SIMULATED | MANUAL | DEVICE), observed_at / recorded_at,
 * retrieved_at, value + unit, quality_status, source_url.
 */
(function (global) {
  "use strict";
  var KEY = "astra_health_v2"; // v2: mission-command redesign, 4-person demo crew

  var METRICS = {
    heart_rate:      { label: "Heart Rate", unit: "BPM", baseline: 68 },
    spo2:            { label: "SpO2", unit: "%", baseline: 98 },
    systolic_bp:     { label: "Blood Pressure (systolic)", unit: "mmHg", baseline: 118 },
    body_temp:       { label: "Body Temperature", unit: "°C", baseline: 36.8 },
    respiratory_rate:{ label: "Respiratory Rate", unit: "breaths/min", baseline: 14 }
  };

  function uid() { return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
  function nowIso() { return new Date().toISOString(); }

  function seedState() {
    // Demo crew — SYNTHETIC people, mission day 142 per the blueprint demo scenario.
    var missionStart = new Date(Date.now() - 141 * 86400000);
    return {
      missions: [{ id: "msn-artemis-demo", mission_name: "Artemis Demo Mission (simulated)",
        start_date: missionStart.toISOString(), status: "active", data_origin: "SIMULATED" }],
      astronauts: [
        { id: "ast-1", name: "Crew Member A (Demo)", mission_id: "msn-artemis-demo", role: "Commander" },
        { id: "ast-2", name: "Crew Member B (Demo)", mission_id: "msn-artemis-demo", role: "Flight Engineer" },
        { id: "ast-3", name: "Crew Member C (Demo)", mission_id: "msn-artemis-demo", role: "Mission Specialist" },
        { id: "ast-4", name: "Crew Member D (Demo)", mission_id: "msn-artemis-demo", role: "Payload Specialist" }
      ],
      baselines: [],       // {astronaut_id, metric, baseline_value, unit, reference_period}
      vital_readings: [],  // provenance-carrying readings
      sleep_logs: [], mood_logs: [], exercise_logs: [],
      radiation_events: [], // DONKI records (NASA_PUBLIC) when fetched
      alerts: [],           // engine-generated alert history
      sync_logs: [],        // {source, last_synced_at, status, error_message}
      nasa_cache: {}        // last successful NASA responses per source (offline cache)
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* corrupted cache -> reseed */ }
    var s = seedState();
    save(s);
    return s;
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked */ }
  }
  function reset() { localStorage.removeItem(KEY); return load(); }

  function setBaselinesFromDefaults(state) {
    state.astronauts.forEach(function (a) {
      Object.keys(METRICS).forEach(function (m) {
        var exists = state.baselines.some(function (b) { return b.astronaut_id === a.id && b.metric === m; });
        if (!exists) state.baselines.push({ astronaut_id: a.id, metric: m,
          baseline_value: METRICS[m].baseline, unit: METRICS[m].unit,
          reference_period: "Pre-flight reference (illustrative, demo)", data_origin: "SIMULATED" });
      });
    });
  }
  function getBaseline(state, astronautId, metric) {
    var b = state.baselines.find(function (x) { return x.astronaut_id === astronautId && x.metric === metric; });
    return b ? b.baseline_value : null;
  }

  // Plausibility ranges (checklist TC-09/TC-10): reject missing, non-numeric,
  // negative or physiologically impossible values before they reach the engine.
  var VALID_RANGES = {
    heart_rate: [20, 250], spo2: [50, 100], systolic_bp: [50, 260],
    body_temp: [25, 45], respiratory_rate: [2, 80]
  };
  function isValidVital(metric, value) {
    var range = VALID_RANGES[metric];
    if (!range) return false;
    if (value === null || value === undefined || value === "" || isNaN(Number(value))) return false;
    var v = Number(value);
    return v >= range[0] && v <= range[1];
  }

  function addVital(state, fields) {
    if (!isValidVital(fields.metric, fields.value)) return null;
    var r = {
      id: uid(), astronaut_id: fields.astronaut_id, metric: fields.metric,
      value: Number(fields.value), unit: fields.unit || (METRICS[fields.metric] || {}).unit || "",
      recorded_at: fields.recorded_at || nowIso(),
      data_origin: fields.data_origin || "MANUAL",
      source_name: fields.source_name || (fields.data_origin === "SIMULATED" ? "ASTRA simulator" : "Manual entry"),
      source_record_id: fields.source_record_id || null,
      retrieved_at: nowIso(),
      quality_status: fields.quality_status || "validated",
      source_url: fields.source_url || null
    };
    state.vital_readings.push(r);
    return r;
  }

  function logSync(state, source, status, errorMessage) {
    state.sync_logs.push({ id: uid(), source: source, last_synced_at: nowIso(),
      status: status, error_message: errorMessage || null });
    if (state.sync_logs.length > 100) state.sync_logs = state.sync_logs.slice(-100);
  }

  global.ASTRA_STORE = { KEY: KEY, METRICS: METRICS, VALID_RANGES: VALID_RANGES, isValidVital: isValidVital,
    load: load, save: save, reset: reset,
    setBaselinesFromDefaults: setBaselinesFromDefaults, getBaseline: getBaseline,
    addVital: addVital, logSync: logSync, uid: uid, nowIso: nowIso };
})(window);
