/**
 * ASTRA HEALTH — Deterministic Health Rules Engine
 *
 * Blueprint core principle:
 * "Use a deterministic, testable rules engine for alert detection.
 * AI should explain the output, not independently decide whether an emergency exists."
 *
 * Alert classification:
 * - NORMAL: Deviation < 15% from personal baseline. Continue monitoring.
 * - WATCH:  15% to 30% deviation, single spike >= 30% (needs recheck), stale reading, or sleep/fatigue pattern.
 * - ACT:    Deviation >= 30% repeated across consecutive readings. Follow medical protocol.
 */

const CONFIG = {
  watchDeviationPct: 15,
  actDeviationPct: 30,
  DEVIATION_WATCH_PCT: 15,
  DEVIATION_ACT_PCT: 30,
  repeatedReadingsForAct: 2,
  staleAfterMinutes: 120
};

const LOWER_IS_WORSE = { spo2: true };

const METRICS = {
  heart_rate:       { label: "Heart Rate", unit: "BPM", defaultBaseline: 68, min: 20, max: 250 },
  spo2:             { label: "SpO2", unit: "%", defaultBaseline: 98, min: 50, max: 100 },
  systolic_bp:      { label: "Blood Pressure (systolic)", unit: "mmHg", defaultBaseline: 118, min: 50, max: 260 },
  body_temp:        { label: "Body Temperature", unit: "°C", defaultBaseline: 36.8, min: 25, max: 45 },
  respiratory_rate: { label: "Respiratory Rate", unit: "breaths/min", defaultBaseline: 14, min: 2, max: 80 }
};

function isValidVital(metric, value) {
  const meta = METRICS[metric];
  if (!meta) return false;
  if (value === null || value === undefined || value === "" || isNaN(Number(value))) return false;
  const v = Number(value);
  return v >= meta.min && v <= meta.max;
}

function deviationPct(value, baseline) {
  if (baseline === null || baseline === undefined || baseline === 0) return null;
  return ((value - baseline) / baseline) * 100;
}

function isStale(reading, nowMs = Date.now()) {
  if (!reading || !reading.recorded_at) return false;
  const ageMin = (nowMs - new Date(reading.recorded_at).getTime()) / 60000;
  return ageMin > CONFIG.staleAfterMinutes;
}

function evaluateMetric(metric, readings, baseline, nowMs = Date.now()) {
  const reasons = [];
  if (!readings || readings.length === 0) {
    return {
      metric,
      severity: "WATCH",
      reason_codes: ["NO_DATA"],
      explanation: `No readings recorded for ${METRICS[metric]?.label || metric}. Monitoring gap — take a reading.`,
      latest: null,
      deviation_pct: null,
      quality: "unavailable"
    };
  }

  const sorted = [...readings].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  const latest = sorted[sorted.length - 1];

  if (latest.quality_status && latest.quality_status !== "validated") {
    reasons.push("QUALITY_" + String(latest.quality_status).toUpperCase().replace(/\s+/g, "_"));
  }
  if (isStale(latest, nowMs)) {
    reasons.push("STALE_READING");
  }

  const dev = deviationPct(latest.value, baseline);
  if (dev === null) {
    return {
      metric,
      severity: reasons.length ? "WATCH" : "NORMAL",
      reason_codes: reasons.concat(["NO_BASELINE"]),
      explanation: `No personal baseline set for ${METRICS[metric]?.label || metric}. Deviation cannot be assessed.`,
      latest,
      deviation_pct: null,
      quality: latest.quality_status || "validated"
    };
  }

  const absDev = Math.abs(dev);
  const concerning = LOWER_IS_WORSE[metric] ? dev < 0 : dev > 0;

  // Count consecutive most-recent readings beyond ACT band in concerning direction
  let repeated = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = deviationPct(sorted[i].value, baseline);
    if (d !== null && Math.abs(d) >= CONFIG.actDeviationPct && (LOWER_IS_WORSE[metric] ? d < 0 : d > 0)) {
      repeated++;
    } else {
      break;
    }
  }

  let severity = "NORMAL";
  if (absDev >= CONFIG.watchDeviationPct && concerning) {
    severity = "WATCH";
    reasons.push("DEVIATION_WATCH");
  }

  if (absDev >= CONFIG.actDeviationPct && concerning && repeated >= CONFIG.repeatedReadingsForAct) {
    severity = "ACT";
    reasons.push("DEVIATION_ACT_REPEATED");
  } else if (absDev >= CONFIG.actDeviationPct && concerning) {
    if (severity === "NORMAL") severity = "WATCH";
    reasons.push("DEVIATION_ACT_SINGLE"); // Single spike: recheck first
  }

  if (reasons.includes("STALE_READING") && severity === "NORMAL") {
    severity = "WATCH";
  }

  const dirWord = dev >= 0 ? "above" : "below";
  const unit = latest.unit || METRICS[metric]?.unit || "";
  let explanation = `Latest ${METRICS[metric]?.label || metric} is ${latest.value} ${unit}, which is ${absDev.toFixed(1)}% ${dirWord} the personal baseline of ${baseline} ${unit}.`;

  if (severity === "ACT") {
    explanation += ` The deviation is large and repeated across ${repeated} consecutive readings. Follow approved onboard medical protocol and notify designated flight surgeon.`;
  } else if (severity === "WATCH") {
    if (reasons.includes("DEVIATION_ACT_SINGLE")) {
      explanation += ` Elevated reading detected without confirmation. Recheck measurement first and review recent activity.`;
    } else {
      explanation += ` Recheck the measurement and review recent exercise, sleep, and symptom context.`;
    }
  } else {
    explanation += ` No significant deviation detected by configured rules.`;
  }

  return {
    metric,
    severity,
    reason_codes: reasons,
    explanation,
    latest,
    deviation_pct: dev,
    quality: latest.quality_status || "validated"
  };
}

function evaluateBehavioral(sleepLogs = [], moodLogs = []) {
  const reasons = [];
  let severity = "NORMAL";
  const notes = [];

  const recentSleep = sleepLogs.slice(-3);
  const shortNights = recentSleep.filter(s => s.duration_hours < 6).length;
  if (recentSleep.length >= 2 && shortNights >= 2) {
    severity = "WATCH";
    reasons.push("SLEEP_PATTERN");
    notes.push(`${shortNights} of the last ${recentSleep.length} sleep logs are under 6 hours.`);
  }

  const recentMood = moodLogs.slice(-3);
  const highFatigue = recentMood.filter(m => m.fatigue >= 7).length;
  if (recentMood.length >= 2 && highFatigue >= 2) {
    if (severity === "NORMAL") severity = "WATCH";
    reasons.push("FATIGUE_PATTERN");
    notes.push(`Fatigue self-reported at 7/10 or higher on ${highFatigue} recent check-ins.`);
  }

  return {
    severity,
    reason_codes: reasons,
    explanation: notes.length ? notes.join(" ") : "No concerning sleep or fatigue patterns in recent check-ins."
  };
}

const SEVERITY_RANK = { NORMAL: 0, WATCH: 1, ACT: 2 };

function overallSeverity(evaluations = []) {
  let worst = "NORMAL";
  evaluations.forEach(e => {
    if ((SEVERITY_RANK[e.severity] || 0) > (SEVERITY_RANK[worst] || 0)) {
      worst = e.severity;
    }
  });
  return worst;
}

module.exports = {
  CONFIG,
  METRICS,
  LOWER_IS_WORSE,
  isValidVital,
  deviationPct,
  isStale,
  evaluateMetric,
  evaluateBehavioral,
  overallSeverity
};

