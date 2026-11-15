/*
 * ASTRA HEALTH — simulated telemetry generator.
 * Blueprint rules: "Use mock telemetry only when explicitly labelled as simulated."
 * Every reading produced here is data_origin: "SIMULATED" and is badged as such
 * in the UI. Includes the blueprint's Day-142 demo scenario: a rising heart-rate
 * trend above the personal baseline plus a short-sleep / high-fatigue pattern,
 * so the deterministic engine raises a workflow alert.
 */
(function (global) {
  "use strict";
  var S = global.ASTRA_STORE;

  function jitter(base, spread) { return Math.round((base + (Math.random() - 0.5) * spread) * 10) / 10; }

  // Backfill 24h of plausible simulated readings for every crew member.
  function backfill(state) {
    var now = Date.now();
    state.astronauts.forEach(function (a, idx) {
      var base = {};
      Object.keys(S.METRICS).forEach(function (m) { base[m] = S.getBaseline(state, a.id, m) || S.METRICS[m].baseline; });
      for (var h = 24; h >= 1; h--) {
        var t = new Date(now - h * 3600000).toISOString();
        // Crew Member A follows the demo scenario: HR climbs in the last 4 hours.
        var hrDrift = (a.id === "ast-1" && h <= 4) ? (5 - h) * 7 : 0;
        S.addVital(state, { astronaut_id: a.id, metric: "heart_rate", value: jitter(base.heart_rate + hrDrift, 5), recorded_at: t, data_origin: "SIMULATED" });
        if (h % 4 === 0) {
          S.addVital(state, { astronaut_id: a.id, metric: "spo2", value: jitter(base.spo2, 1), recorded_at: t, data_origin: "SIMULATED" });
          S.addVital(state, { astronaut_id: a.id, metric: "systolic_bp", value: jitter(base.systolic_bp, 6), recorded_at: t, data_origin: "SIMULATED" });
          S.addVital(state, { astronaut_id: a.id, metric: "body_temp", value: jitter(base.body_temp, 0.3), recorded_at: t, data_origin: "SIMULATED" });
          S.addVital(state, { astronaut_id: a.id, metric: "respiratory_rate", value: jitter(base.respiratory_rate, 2), recorded_at: t, data_origin: "SIMULATED" });
        }
      }
      // Sleep + mood history (demo pattern for ast-1: short sleep, high fatigue).
      for (var d = 3; d >= 1; d--) {
        var day = new Date(now - d * 86400000).toISOString();
        state.sleep_logs.push({ id: S.uid(), astronaut_id: a.id,
          duration_hours: a.id === "ast-1" ? jitter(5.2, 0.8) : jitter(7.4, 1),
          quality: a.id === "ast-1" ? "poor" : "good", recorded_at: day, data_origin: "SIMULATED" });
        state.mood_logs.push({ id: S.uid(), astronaut_id: a.id,
          mood: a.id === "ast-1" ? 4 : 7, stress: a.id === "ast-1" ? 7 : 3,
          fatigue: a.id === "ast-1" ? 8 : 3, recorded_at: day, data_origin: "SIMULATED" });
      }
      state.exercise_logs.push({ id: S.uid(), astronaut_id: a.id, activity_type: "Treadmill (T2)",
        duration_min: 30 + idx * 5, intensity: "moderate", recorded_at: new Date(now - 5 * 3600000).toISOString(), data_origin: "SIMULATED" });
    });
  }

  // One live tick: append a fresh simulated reading set "now".
  function tick(state) {
    state.astronauts.forEach(function (a) {
      var base = S.getBaseline(state, a.id, "heart_rate") || 68;
      var drift = a.id === "ast-1" ? 24 : 0; // demo scenario: sustained elevation
      S.addVital(state, { astronaut_id: a.id, metric: "heart_rate", value: jitter(base + drift, 4), data_origin: "SIMULATED" });
      S.addVital(state, { astronaut_id: a.id, metric: "spo2", value: jitter(S.getBaseline(state, a.id, "spo2") || 98, 1), data_origin: "SIMULATED" });
    });
  }

  global.ASTRA_SIM = { backfill: backfill, tick: tick };
})(window);
