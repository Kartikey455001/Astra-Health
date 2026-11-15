/**
 * ASTRA HEALTH — Store Service
 * Implements the full database design specified in Section 7 of the blueprint:
 * Tables:
 * - astronauts
 * - health_baselines
 * - vital_readings
 * - sleep_logs
 * - mood_logs
 * - exercise_logs
 * - radiation_events
 * - radiation_readings
 * - alerts
 * - nasa_datasets
 * - research_records
 * - sync_logs
 *
 * Persists to JSON / SQLite storage, applies validation & provenance rules.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { evaluateMetric, evaluateBehavioral, overallSeverity, isValidVital, METRICS } = require("../engines/healthEngine");

const DATA_DIR = path.resolve(__dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "astra-database.json");

function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

function normalizeAstroId(id) {
  if (!id) return id;
  const s = String(id).trim().toLowerCase();
  if (s === "ast-001" || s === "ast001" || s === "1") return "ast-1";
  if (s === "ast-002" || s === "ast002" || s === "2") return "ast-2";
  if (s === "ast-003" || s === "ast003" || s === "3") return "ast-3";
  if (s === "ast-004" || s === "ast004" || s === "4") return "ast-4";
  return s;
}

function nowIso() {
  return new Date().toISOString();
}

const datasetInventory = require("../nasa/datasetInventory");

function seedState() {
  const missionStart = new Date(Date.now() - 141 * 86400000);
  const astronauts = [
    { id: "ast-1", name: "Crew Member A", mission_id: "msn-artemis-demo", role: "Commander", created_at: nowIso() },
    { id: "ast-2", name: "Crew Member B", mission_id: "msn-artemis-demo", role: "Flight Engineer", created_at: nowIso() },
    { id: "ast-3", name: "Crew Member C", mission_id: "msn-artemis-demo", role: "Mission Specialist", created_at: nowIso() },
    { id: "ast-4", name: "Crew Member D", mission_id: "msn-artemis-demo", role: "Payload Specialist", created_at: nowIso() }
  ];

  const baselines = [];
  astronauts.forEach(a => {
    Object.keys(METRICS).forEach(m => {
      baselines.push({
        id: uid("bsl"),
        astronaut_id: a.id,
        metric: m,
        baseline_value: METRICS[m].defaultBaseline,
        unit: METRICS[m].unit,
        reference_period: "Pre-flight physiological baseline assessment",
        data_origin: "SIMULATED",
        created_at: nowIso()
      });
    });
  });

  const vital_readings = [];
  const sleep_logs = [];
  const mood_logs = [];
  const exercise_logs = [];

  const now = Date.now();
  // Generate Day-142 telemetry
  astronauts.forEach((a, idx) => {
    for (let h = 24; h >= 0; h--) {
      const t = new Date(now - h * 3600000).toISOString();
      // Demo scenario: Ast-1 HR rises in the last 4 hours (Day-142 scenario)
      const hrDrift = (a.id === "ast-1" && h <= 4) ? (5 - h) * 7 : 0;
      const hrBase = METRICS.heart_rate.defaultBaseline;
      const hrJitter = Math.round(((Math.random() - 0.5) * 2) * 10) / 10;
      vital_readings.push({
        id: uid("vit"),
        astronaut_id: a.id,
        metric: "heart_rate",
        value: Math.round((hrBase + hrDrift + hrJitter) * 10) / 10,
        unit: "BPM",
        recorded_at: t,
        retrieved_at: nowIso(),
        data_origin: "SIMULATED",
        quality_status: "validated",
        source_name: "ASTRA Telemetry Simulator",
        source_record_id: `SIM-HR-${a.id}-${h}`,
        source_url: null
      });

      if (h % 4 === 0 || h === 0) {
        vital_readings.push({
          id: uid("vit"),
          astronaut_id: a.id,
          metric: "spo2",
          value: Math.round((METRICS.spo2.defaultBaseline + (Math.random() - 0.5) * 1) * 10) / 10,
          unit: "%",
          recorded_at: t,
          retrieved_at: nowIso(),
          data_origin: "SIMULATED",
          quality_status: "validated",
          source_name: "ASTRA Telemetry Simulator",
          source_record_id: `SIM-SPO2-${a.id}-${h}`,
          source_url: null
        });
        vital_readings.push({
          id: uid("vit"),
          astronaut_id: a.id,
          metric: "systolic_bp",
          value: Math.round((METRICS.systolic_bp.defaultBaseline + (Math.random() - 0.5) * 4) * 10) / 10,
          unit: "mmHg",
          recorded_at: t,
          retrieved_at: nowIso(),
          data_origin: "SIMULATED",
          quality_status: "validated",
          source_name: "ASTRA Telemetry Simulator",
          source_record_id: `SIM-BP-${a.id}-${h}`,
          source_url: null
        });
        vital_readings.push({
          id: uid("vit"),
          astronaut_id: a.id,
          metric: "body_temp",
          value: Math.round((METRICS.body_temp.defaultBaseline + (Math.random() - 0.5) * 0.2) * 10) / 10,
          unit: "°C",
          recorded_at: t,
          retrieved_at: nowIso(),
          data_origin: "SIMULATED",
          quality_status: "validated",
          source_name: "ASTRA Telemetry Simulator",
          source_record_id: `SIM-TEMP-${a.id}-${h}`,
          source_url: null
        });
        vital_readings.push({
          id: uid("vit"),
          astronaut_id: a.id,
          metric: "respiratory_rate",
          value: Math.round((METRICS.respiratory_rate.defaultBaseline + (Math.random() - 0.5) * 1) * 10) / 10,
          unit: "breaths/min",
          recorded_at: t,
          retrieved_at: nowIso(),
          data_origin: "SIMULATED",
          quality_status: "validated",
          source_name: "ASTRA Telemetry Simulator",
          source_record_id: `SIM-RESP-${a.id}-${h}`,
          source_url: null
        });
      }
    }

    // 3 days of sleep and mood logs
    for (let d = 3; d >= 1; d--) {
      const day = new Date(now - d * 86400000).toISOString();
      sleep_logs.push({
        id: uid("slp"),
        astronaut_id: a.id,
        duration_hours: a.id === "ast-1" ? 5.2 : 7.4,
        quality: a.id === "ast-1" ? "poor" : "good",
        recorded_at: day,
        data_origin: "SIMULATED",
        quality_status: "validated"
      });
      mood_logs.push({
        id: uid("mod"),
        astronaut_id: a.id,
        mood: a.id === "ast-1" ? 4 : 8,
        stress: a.id === "ast-1" ? 7 : 3,
        fatigue: a.id === "ast-1" ? 8 : 3,
        recorded_at: day,
        data_origin: "SIMULATED",
        quality_status: "validated"
      });
    }

    exercise_logs.push({
      id: uid("exe"),
      astronaut_id: a.id,
      activity_type: "Treadmill (T2)",
      duration_min: 30 + idx * 5,
      intensity: "moderate",
      recorded_at: new Date(now - 5 * 3600000).toISOString(),
      data_origin: "SIMULATED",
      quality_status: "validated"
    });
  });

  // Strictly ingest all datasets from ASTRA_HEALTH_NASA_Dataset_Inventory.csv
  const inventoryDatasets = datasetInventory.getAllDatasets();
  const nasa_datasets = inventoryDatasets.map(item => ({
    id: uid("nds"),
    source: item.source,
    dataset_id: item.dataset_id,
    title: item.study_title,
    domain: item.domain,
    assay_or_measurement: item.assay_or_measurement,
    sample_type: item.sample_type,
    url: item.download_or_file_listing_url || item.study_page_url,
    study_page_url: item.study_page_url,
    citation_url: item.citation_url,
    category: item.domain.includes("blood") ? "Blood & Hematology" :
              item.domain.includes("immune") ? "Immune system" :
              item.domain.includes("microbiome") ? "Microbiome" :
              item.domain.includes("Radiation") || item.domain.includes("Space weather") ? "Radiation" : "General Spaceflight",
    astra_use: item.ASTRA_use,
    verification_status: item.verification_status,
    created_at: nowIso()
  }));

  const research_records = inventoryDatasets.map(item => ({
    id: uid("rec"),
    source_id: item.dataset_id,
    source_name: item.source,
    title: item.study_title,
    summary: `${item.assay_or_measurement}. Sample: ${item.sample_type}. ASTRA Use: ${item.ASTRA_use}`,
    citation: item.citation_url || item.study_page_url,
    url: item.study_page_url || item.download_or_file_listing_url,
    data_origin: "NASA_PUBLIC",
    retrieved_at: nowIso()
  }));

  return {
    missions: [{ id: "msn-artemis-demo", mission_name: "Ortemis/Orion-1 Mission", start_date: missionStart.toISOString(), status: "active", data_origin: "SIMULATED" }],
    astronauts,
    health_baselines: baselines,
    vital_readings,
    sleep_logs,
    mood_logs,
    exercise_logs,
    radiation_events: [],
    radiation_readings: [
      { id: uid("rad"), astronaut_id: "ast-1", dose: 0.42, unit: "mSv", recorded_at: nowIso(), data_origin: "SIMULATED", quality_status: "validated", source_name: "Active Personal Dosimeter" }
    ],
    alerts: [],
    nasa_datasets,
    research_records,
    sync_logs: [
      { id: uid("syn"), source: "NASA DONKI", last_synced_at: nowIso(), status: "ok", error_message: null, record_count: 0 },
      { id: uid("syn"), source: "NASA OSDR", last_synced_at: nowIso(), status: "ok", error_message: null, record_count: 5 },
      { id: uid("syn"), source: "NASA NTRS", last_synced_at: nowIso(), status: "ok", error_message: null, record_count: 4 }
    ],
    last_updated: nowIso()
  };
}

class StoreService {
  constructor() {
    this.state = null;
    this.listeners = new Set();
    this.init();
  }

  init() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf8");
        this.state = JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Could not load database file, reseeding state:", e.message);
    }

    if (!this.state || !Array.isArray(this.state.astronauts)) {
      this.state = seedState();
      this.recalculateAlerts();
      this.save();
    }
  }

  save() {
    try {
      this.state.last_updated = nowIso();
      const content = JSON.stringify(this.state, null, 2);
      fs.writeFileSync(DB_FILE, content, "utf8");
    } catch (e) {
      console.error("Failed to save database file:", e.message);
    }
  }

  reset() {
    this.state = seedState();
    this.recalculateAlerts();
    this.save();
    this.notify("reset", this.state);
    return this.state;
  }

  onUpdate(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(event, payload) {
    for (const fn of this.listeners) {
      try { fn(event, payload); } catch (e) { console.error("Listener error:", e); }
    }
  }

  // Astronauts
  getAstronauts() {
    return this.state.astronauts;
  }

  getAstronaut(id) {
    if (!id) return null;
    const cleanId = normalizeAstroId(id);
    return this.state.astronauts.find(a => a.id === cleanId || a.id.toLowerCase() === String(id).toLowerCase());
  }

  // Baselines
  getBaselines(astronautId) {
    if (astronautId) {
      const cleanId = normalizeAstroId(astronautId);
      return this.state.health_baselines.filter(b => b.astronaut_id === cleanId || b.astronaut_id.toLowerCase() === String(astronautId).toLowerCase());
    }
    return this.state.health_baselines;
  }

  getBaseline(astronautId, metric) {
    const cleanId = normalizeAstroId(astronautId);
    const b = this.state.health_baselines.find(x => (x.astronaut_id === cleanId || x.astronaut_id.toLowerCase() === String(astronautId).toLowerCase()) && x.metric === metric);
    return b ? b.baseline_value : null;
  }

  setBaseline(astronautId, metric, value, unit) {
    const cleanId = normalizeAstroId(astronautId);
    let b = this.state.health_baselines.find(x => (x.astronaut_id === cleanId || x.astronaut_id.toLowerCase() === String(astronautId).toLowerCase()) && x.metric === metric);
    if (b) {
      b.baseline_value = Number(value);
      if (unit) b.unit = unit;
      b.updated_at = nowIso();
    } else {
      b = {
        id: uid("bsl"),
        astronaut_id: cleanId,
        metric,
        baseline_value: Number(value),
        unit: unit || METRICS[metric]?.unit || "",
        reference_period: "Manual baseline update",
        data_origin: "MANUAL",
        created_at: nowIso()
      };
      this.state.health_baselines.push(b);
    }
    this.recalculateAlerts();
    this.save();
    this.notify("baseline_updated", b);
    return b;
  }

  // Vitals
  getVitals(astronautId, metric = null, limit = 50) {
    const cleanId = normalizeAstroId(astronautId);
    return this.state.vital_readings
      .filter(r => (!cleanId || r.astronaut_id === cleanId || r.astronaut_id.toLowerCase() === String(astronautId).toLowerCase()) && (!metric || r.metric === metric))
      .slice(-limit);
  }

  addVital(data) {
    const { id, astronaut_id, metric, value, unit, quality_status, data_origin, source_name, recorded_at } = data;
    const cleanId = normalizeAstroId(astronaut_id) || "ast-1";
    if (!isValidVital(metric, value)) {
      throw new Error(`Invalid vital measurement: ${metric} = ${value}. Must be within physiological range.`);
    }

    if (id) {
      const existing = this.state.vital_readings.find(r => r.id === id);
      if (existing) {
        return existing;
      }
    }

    const reading = {
      id: id || uid("vit"),
      astronaut_id: cleanId,
      metric,
      value: Number(value),
      unit: unit || METRICS[metric]?.unit || "",
      recorded_at: recorded_at || nowIso(),
      retrieved_at: nowIso(),
      data_origin: data_origin || "MANUAL",
      quality_status: quality_status || "validated",
      source_name: source_name || (data_origin === "SIMULATED" ? "ASTRA Telemetry Simulator" : "Manual Entry"),
      source_record_id: data.source_record_id || null,
      source_url: data.source_url || null
    };

    this.state.vital_readings.push(reading);
    this.recalculateAlerts();
    this.save();
    this.notify("vital_added", reading);
    return reading;
  }

  // Behavioral Logs
  addSleepLog(data) {
    const aid = normalizeAstroId(data.astronaut_id) || "ast-1";
    const log = {
      id: uid("slp"),
      astronaut_id: aid,
      duration_hours: Number(data.duration_hours),
      quality: data.quality || "good",
      recorded_at: data.recorded_at || nowIso(),
      data_origin: data.data_origin || "MANUAL",
      quality_status: "validated"
    };
    this.state.sleep_logs.push(log);
    this.recalculateAlerts();
    this.save();
    this.notify("sleep_logged", log);
    return log;
  }

  addMoodLog(data) {
    const aid = normalizeAstroId(data.astronaut_id) || "ast-1";
    const log = {
      id: uid("mod"),
      astronaut_id: aid,
      mood: parseInt(data.mood, 10),
      stress: parseInt(data.stress, 10),
      fatigue: parseInt(data.fatigue, 10),
      recorded_at: data.recorded_at || nowIso(),
      data_origin: data.data_origin || "MANUAL",
      quality_status: "validated"
    };
    this.state.mood_logs.push(log);
    this.recalculateAlerts();
    this.save();
    this.notify("mood_logged", log);
    return log;
  }

  addExerciseLog(data) {
    const aid = normalizeAstroId(data.astronaut_id) || "ast-1";
    const log = {
      id: uid("exe"),
      astronaut_id: aid,
      activity_type: data.activity_type,
      duration_min: parseInt(data.duration_min, 10),
      intensity: data.intensity || "moderate",
      recorded_at: data.recorded_at || nowIso(),
      data_origin: data.data_origin || "MANUAL",
      quality_status: "validated"
    };
    this.state.exercise_logs.push(log);
    this.save();
    this.notify("exercise_logged", log);
    return log;
  }

  getBehavioralSummary(astronautId) {
    const aid = normalizeAstroId(astronautId) || "ast-1";
    const sleeps = this.state.sleep_logs.filter(s => s.astronaut_id === aid);
    const moods = this.state.mood_logs.filter(m => m.astronaut_id === aid);
    const exercises = this.state.exercise_logs.filter(e => e.astronaut_id === aid);
    const evaluation = evaluateBehavioral(sleeps, moods);

    return {
      astronaut_id: aid,
      evaluation,
      sleep_logs: sleeps.slice(-10),
      mood_logs: moods.slice(-10),
      exercise_logs: exercises.slice(-10)
    };
  }

  // Evaluation & Alerts
  evaluateCrewMember(astronautId) {
    const cleanId = normalizeAstroId(astronautId) || "ast-1";
    const astro = this.getAstronaut(cleanId);
    if (!astro) throw new Error("Astronaut not found: " + astronautId);

    const evals = Object.keys(METRICS).map(m => {
      const readings = this.getVitals(cleanId, m, 50);
      const baseline = this.getBaseline(cleanId, m);
      return evaluateMetric(m, readings, baseline, Date.now());
    });

    const sleeps = this.state.sleep_logs.filter(s => s.astronaut_id === cleanId);
    const moods = this.state.mood_logs.filter(m => m.astronaut_id === cleanId);
    const behavioral = evaluateBehavioral(sleeps, moods);

    const overall = overallSeverity([...evals, behavioral]);

    return {
      astronaut: astro,
      overall,
      evals,
      behavioral
    };
  }

  recalculateAlerts() {
    const now = Date.now();
    for (const a of this.state.astronauts) {
      const res = this.evaluateCrewMember(a.id);
      const items = [...res.evals, { metric: "behavioral", severity: res.behavioral.severity, reason_codes: res.behavioral.reason_codes, explanation: res.behavioral.explanation }];

      for (const item of items) {
        if (item.severity === "NORMAL") continue;

        // Deduplicate: same astronaut, metric, severity within 30 min
        const exists = this.state.alerts.some(al =>
          al.astronaut_id === a.id &&
          al.metric === item.metric &&
          al.severity === item.severity &&
          (now - new Date(al.created_at).getTime()) < 30 * 60000
        );

        if (!exists) {
          const alert = {
            id: uid("alt"),
            astronaut_id: a.id,
            metric: item.metric,
            severity: item.severity,
            reason: item.explanation,
            reason_codes: JSON.stringify(item.reason_codes || []),
            status: "open",
            created_at: nowIso(),
            data_origin: "SIMULATED"
          };
          this.state.alerts.push(alert);
          this.notify("alert_created", alert);
        }
      }
    }
  }

  addAlert(data) {
    const { astronaut_id, metric, severity, reason_codes, reason, created_at, data_origin } = data;
    const now = Date.now();
    // Deduplicate: same astronaut, metric, severity within 30 min
    const exists = this.state.alerts.some(al =>
      al.astronaut_id === astronaut_id &&
      al.metric === metric &&
      al.severity === severity &&
      (now - new Date(al.created_at).getTime()) < 30 * 60000
    );

    if (exists) {
      return null;
    }

    const alert = {
      id: data.id || uid("alt"),
      astronaut_id,
      metric,
      severity,
      reason: reason || `Automated alert for ${metric} at ${severity} severity`,
      reason_codes: Array.isArray(reason_codes) ? JSON.stringify(reason_codes) : (reason_codes || "[]"),
      status: "open",
      created_at: created_at || nowIso(),
      data_origin: data_origin || "SIMULATED"
    };
    this.state.alerts.push(alert);
    this.save();
    this.notify("alert_created", alert);
    return alert;
  }

  getAlerts(limit = 20) {
    return this.state.alerts.slice(-limit).reverse();
  }

  getDailyReport(astronautId = "ast-1") {
    const cleanId = normalizeAstroId(astronautId) || "ast-1";
    const evaluated = this.evaluateCrewMember(cleanId);
    const mission = (this.state.missions && this.state.missions[0]) || { start_date: new Date(Date.now() - 142 * 86400000).toISOString() };
    const missionDay = Math.max(142, Math.floor((Date.now() - new Date(mission.start_date).getTime()) / 86400000) + 1);

    return {
      mission_id: mission.id || "msn-artemis-demo",
      mission_day: missionDay,
      generated_at: nowIso(),
      astronaut: evaluated.astronaut,
      overall_status: evaluated.overall,
      vitals_evaluation: evaluated.evals,
      behavioral_evaluation: evaluated.behavioral,
      recent_radiation: this.state.radiation_readings.filter(r => r.astronaut_id === cleanId).slice(-5),
      space_weather_events: this.state.radiation_events.slice(-5),
      data_notice: "Simulated telemetry for mission operations demonstration.",
      disclaimer: "ASTRA does not provide clinical diagnoses. Alerts reflect deterministic flight-rule thresholds."
    };
  }

  // Radiation Events & Readings
  setRadiationEvents(events) {
    this.state.radiation_events = events;
    this.save();
    this.notify("radiation_events_updated", events);
  }

  getRadiationEvents() {
    return this.state.radiation_events;
  }

  // Sync Logs
  logSync(source, status, errorMessage = null, recordCount = 0) {
    const log = {
      id: uid("syn"),
      source,
      last_synced_at: nowIso(),
      status,
      error_message: errorMessage,
      record_count: recordCount
    };
    this.state.sync_logs.push(log);
    if (this.state.sync_logs.length > 100) this.state.sync_logs = this.state.sync_logs.slice(-100);
    this.save();
    return log;
  }

  getSyncLogs() {
    return this.state.sync_logs;
  }

  // Simulation Tick
  tickSimulation() {
    this.state.astronauts.forEach(a => {
      const hrBase = this.getBaseline(a.id, "heart_rate") || 68;
      const drift = a.id === "ast-1" ? 24 : 0; // Ast-1 elevated
      const jitter = (Math.random() - 0.5) * 4;
      this.addVital({
        astronaut_id: a.id,
        metric: "heart_rate",
        value: Math.round((hrBase + drift + jitter) * 10) / 10,
        unit: "BPM",
        data_origin: "SIMULATED",
        quality_status: "validated"
      });

      const spo2Base = this.getBaseline(a.id, "spo2") || 98;
      this.addVital({
        astronaut_id: a.id,
        metric: "spo2",
        value: Math.round((spo2Base + (Math.random() - 0.5) * 1) * 10) / 10,
        unit: "%",
        data_origin: "SIMULATED",
        quality_status: "validated"
      });
    });

    return this.evaluateAllCrew();
  }

  evaluateAllCrew() {
    return this.state.astronauts.map(a => this.evaluateCrewMember(a.id));
  }
}

const storeInstance = new StoreService();
module.exports = storeInstance;
