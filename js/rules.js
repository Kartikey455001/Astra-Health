/*
 * ASTRA HEALTH — deterministic health rules engine.
 * Blueprint rule: "Use a deterministic, testable rules engine for alert detection.
 * AI should explain the output, not independently decide whether an emergency exists."
 *
 * No clinical thresholds are invented here. Every comparison is against the crew
 * member's own PERSONAL BASELINE plus data-quality checks. Alert classes are the
 * blueprint's proposed workflow labels (NORMAL / WATCH / ACT), not NASA-approved
 * medical thresholds.
 *
 * Works in browser (window.ASTRA_RULES) and in Node for tests (module.exports).
 */
(function (global) {
  "use strict";

  // Deviation bands, expressed as % deviation from the personal baseline.
  // These are workflow configuration values for the prototype, clearly labelled
  // in the UI as prototype configuration — not clinical guidance.
  var CONFIG = {
    watchDeviationPct: 15,   // |deviation| >= 15%  -> at least WATCH
    actDeviationPct: 30,     // |deviation| >= 30%  -> ACT candidate
    repeatedReadingsForAct: 2, // ACT needs the deviation repeated, not one spike
    staleAfterMinutes: 120   // readings older than this are flagged stale
  };

  // Metrics where a DROP is the concerning direction (others: rise is concerning).
  var LOWER_IS_WORSE = { spo2: true };

  function deviationPct(value, baseline) {
    if (baseline === null || baseline === undefined || baseline === 0) return null;
    return ((value - baseline) / baseline) * 100;
  }

  function isStale(reading, nowMs) {
    var ageMin = (nowMs - Date.parse(reading.recorded_at)) / 60000;
    return ageMin > CONFIG.staleAfterMinutes;
  }

  // Evaluate one metric for one astronaut.
  // readings: array of vital_readings for that metric, any order.
  // baseline: baseline_value for that metric (number) or null.
  // Returns { severity, reason_codes[], explanation, latest, deviation_pct, quality }
  function evaluateMetric(metric, readings, baseline, nowMs) {
    var reasons = [];
    if (!readings || readings.length === 0) {
      return { metric: metric, severity: "WATCH", reason_codes: ["NO_DATA"],
        explanation: "No readings recorded for this metric. Monitoring gap — take a reading.",
        latest: null, deviation_pct: null, quality: "unavailable" };
    }
    var sorted = readings.slice().sort(function (a, b) {
      return Date.parse(a.recorded_at) - Date.parse(b.recorded_at);
    });
    var latest = sorted[sorted.length - 1];

    if (latest.quality_status && latest.quality_status !== "validated") {
      reasons.push("QUALITY_" + String(latest.quality_status).toUpperCase());
    }
    if (isStale(latest, nowMs)) reasons.push("STALE_READING");

    var dev = deviationPct(latest.value, baseline);
    if (dev === null) {
      return { metric: metric, severity: reasons.length ? "WATCH" : "NORMAL",
        reason_codes: reasons.concat(["NO_BASELINE"]),
        explanation: "No personal baseline set for this metric yet, so deviation cannot be assessed.",
        latest: latest, deviation_pct: null, quality: latest.quality_status || "validated" };
    }

    var absDev = Math.abs(dev);
    var concerning = LOWER_IS_WORSE[metric] ? dev < 0 : dev > 0;

    // Count consecutive most-recent readings beyond the ACT band (same direction).
    var repeated = 0;
    for (var i = sorted.length - 1; i >= 0; i--) {
      var d = deviationPct(sorted[i].value, baseline);
      if (d !== null && Math.abs(d) >= CONFIG.actDeviationPct &&
          (LOWER_IS_WORSE[metric] ? d < 0 : d > 0)) repeated++;
      else break;
    }

    var severity = "NORMAL";
    if (absDev >= CONFIG.watchDeviationPct && concerning) {
      severity = "WATCH";
      reasons.push("DEVIATION_WATCH");
    }
    if (absDev >= CONFIG.actDeviationPct && concerning && repeated >= CONFIG.repeatedReadingsForAct) {
      severity = "ACT";
      reasons.push("DEVIATION_ACT_REPEATED");
    } else if (absDev >= CONFIG.actDeviationPct && concerning) {
      if (severity === "NORMAL") severity = "WATCH";
      reasons.push("DEVIATION_ACT_SINGLE"); // one spike: verify before acting
    }
    if (reasons.indexOf("STALE_READING") !== -1 && severity === "NORMAL") severity = "WATCH";

    var dirWord = dev >= 0 ? "above" : "below";
    var explanation = "Latest " + metric + " is " + latest.value + " " + (latest.unit || "") +
      ", which is " + Math.abs(dev).toFixed(1) + "% " + dirWord + " the personal baseline of " +
      baseline + " " + (latest.unit || "") + "." +
      (severity === "ACT" ? " The deviation is large and repeated across " + repeated +
        " consecutive readings. Follow the approved onboard medical protocol and notify designated medical personnel." :
       severity === "WATCH" ? " Recheck the measurement and review recent exercise, sleep and symptom context." :
        " No significant deviation detected by the configured rules.");

    return { metric: metric, severity: severity, reason_codes: reasons,
      explanation: explanation, latest: latest, deviation_pct: dev,
      quality: latest.quality_status || "validated" };
  }

  // Behavioral pattern check (sleep / fatigue), per blueprint demo scenario.
  function evaluateBehavioral(sleepLogs, moodLogs) {
    var reasons = [];
    var severity = "NORMAL";
    var notes = [];
    var recentSleep = (sleepLogs || []).slice(-3);
    var shortNights = recentSleep.filter(function (s) { return s.duration_hours < 6; }).length;
    if (recentSleep.length >= 2 && shortNights >= 2) {
      severity = "WATCH"; reasons.push("SLEEP_PATTERN");
      notes.push(shortNights + " of the last " + recentSleep.length + " sleep logs are under 6 hours.");
    }
    var recentMood = (moodLogs || []).slice(-3);
    var highFatigue = recentMood.filter(function (m) { return m.fatigue >= 7; }).length;
    if (recentMood.length >= 2 && highFatigue >= 2) {
      if (severity === "NORMAL") severity = "WATCH";
      reasons.push("FATIGUE_PATTERN");
      notes.push("Fatigue self-reported at 7/10 or higher on " + highFatigue + " recent check-ins.");
    }
    return { severity: severity, reason_codes: reasons,
      explanation: notes.length ? notes.join(" ") : "No concerning sleep or fatigue pattern in recent check-ins." };
  }

  var SEVERITY_RANK = { NORMAL: 0, WATCH: 1, ACT: 2 };
  function overallSeverity(evaluations) {
    var worst = "NORMAL";
    (evaluations || []).forEach(function (e) {
      if (SEVERITY_RANK[e.severity] > SEVERITY_RANK[worst]) worst = e.severity;
    });
    return worst;
  }

  var api = { CONFIG: CONFIG, deviationPct: deviationPct, evaluateMetric: evaluateMetric,
    evaluateBehavioral: evaluateBehavioral, overallSeverity: overallSeverity, isStale: isStale };
  global.ASTRA_RULES = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
