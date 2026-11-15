/**
 * ASTRA HEALTH — Client-Side Deterministic Rules Engine
 * Runs completely offline in the browser to maintain monitoring when disconnected.
 */

export const CONFIG = {
  watchDeviationPct: 15,
  actDeviationPct: 30,
  repeatedReadingsForAct: 2,
  staleAfterMinutes: 120
};

export const LOWER_IS_WORSE = { spo2: true };

export const METRICS = {
  heart_rate: { label: "Heart Rate", unit: "BPM", baseline: 68, min: 20, max: 250 },
  spo2: { label: "SpO2", unit: "%", baseline: 98, min: 50, max: 100 },
  systolic_bp: { label: "Blood Pressure (systolic)", unit: "mmHg", baseline: 118, min: 50, max: 260 },
  body_temp: { label: "Body Temperature", unit: "°C", baseline: 36.8, min: 25, max: 45 },
  respiratory_rate: { label: "Respiratory Rate", unit: "breaths/min", baseline: 14, min: 2, max: 80 }
};

export function deviationPct(value, baseline) {
  if (baseline === null || baseline === undefined || baseline === 0) return null;
  return ((value - baseline) / baseline) * 100;
}

export function isStale(reading, nowMs = Date.now()) {
  if (!reading || !reading.recorded_at) return false;
  const ageMin = (nowMs - new Date(reading.recorded_at).getTime()) / 60000;
  return ageMin > CONFIG.staleAfterMinutes;
}

export function evaluateMetric(metric, readings, baseline, nowMs = Date.now()) {
  const reasons = [];
  if (!readings || readings.length === 0) {
    return {
      metric,
      severity: "WATCH",
      reason_codes: ["NO_DATA"],
      explanation: `No readings recorded for this metric. Monitoring gap — take a reading.`,
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
      explanation: "No personal baseline set for this metric yet, so deviation cannot be assessed.",
      latest,
      deviation_pct: null,
      quality: latest.quality_status || "validated"
    };
  }

  const absDev = Math.abs(dev);
  const concerning = LOWER_IS_WORSE[metric] ? dev < 0 : dev > 0;

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
    reasons.push("DEVIATION_ACT_SINGLE");
  }

  if (reasons.includes("STALE_READING") && severity === "NORMAL") {
    severity = "WATCH";
  }

  const dirWord = dev >= 0 ? "above" : "below";
  const unit = latest.unit || METRICS[metric]?.unit || "";
  let explanation = `Latest ${metric} is ${latest.value} ${unit}, which is ${absDev.toFixed(1)}% ${dirWord} the personal baseline of ${baseline} ${unit}.`;

  if (severity === "ACT") {
    explanation += ` The deviation is large and repeated across ${repeated} consecutive readings. Follow approved onboard medical protocol and notify designated medical personnel.`;
  } else if (severity === "WATCH") {
    if (reasons.includes("DEVIATION_ACT_SINGLE")) {
      explanation += ` Elevated reading without confirmation. Recheck measurement first and review recent activity.`;
    } else {
      explanation += ` Recheck the measurement and review recent exercise, sleep, and symptom context.`;
    }
  } else {
    explanation += ` No significant deviation detected by the configured rules.`;
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

export function evaluateBehavioral(sleepLogs = [], moodLogs = []) {
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
    explanation: notes.length ? notes.join(" ") : "No concerning sleep or fatigue pattern in recent check-ins."
  };
}

const SEVERITY_RANK = { NORMAL: 0, WATCH: 1, ACT: 2 };

export function overallSeverity(evaluations = []) {
  let worst = "NORMAL";
  evaluations.forEach(e => {
    if ((SEVERITY_RANK[e.severity] || 0) > (SEVERITY_RANK[worst] || 0)) {
      worst = e.severity;
    }
  });
  return worst;
}

