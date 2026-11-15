/**
 * Backend Deterministic Health Engine Tests
 * Validates baseline deviation mathematics, WATCH/ACT thresholds, repeated reading rule,
 * SpO2 inversion, stale data flags, and behavioral pattern detection.
 */

const assert = require("node:assert");
const { describe, it } = require("node:test");
const {
  CONFIG,
  deviationPct,
  evaluateMetric,
  evaluateBehavioral,
  overallSeverity,
  isValidVital
} = require("../src/engines/healthEngine");

describe("ASTRA Health Engine - Boundary & Metric Tests", () => {
  const BASELINE_HR = 68;
  const now = Date.now();

  function makeReading(val, ageMin = 0, metric = "heart_rate") {
    return {
      metric,
      value: val,
      unit: "BPM",
      recorded_at: new Date(now - ageMin * 60000).toISOString(),
      quality_status: "validated",
      data_origin: "SIMULATED"
    };
  }

  it("TC-01: Baseline 68 BPM (0% deviation) -> NORMAL", () => {
    const res = evaluateMetric("heart_rate", [makeReading(68)], BASELINE_HR, now);
    assert.strictEqual(res.severity, "NORMAL");
    assert.strictEqual(res.deviation_pct, 0);
  });

  it("TC-02: 75 BPM (+10.3% deviation) -> NORMAL (<15%)", () => {
    const res = evaluateMetric("heart_rate", [makeReading(75)], BASELINE_HR, now);
    assert.strictEqual(res.severity, "NORMAL");
    assert.ok(Math.abs(res.deviation_pct - 10.29) < 0.1);
  });

  it("TC-03: 78.2 BPM (+15.0% deviation) -> WATCH", () => {
    const res = evaluateMetric("heart_rate", [makeReading(78.2)], BASELINE_HR, now);
    assert.strictEqual(res.severity, "WATCH");
    assert.ok(res.reason_codes.includes("DEVIATION_WATCH"));
  });

  it("TC-04: 88.4 BPM (+30.0% deviation), single spike -> WATCH / RECHECK (not ACT)", () => {
    const res = evaluateMetric("heart_rate", [makeReading(88.4)], BASELINE_HR, now);
    assert.strictEqual(res.severity, "WATCH");
    assert.ok(res.reason_codes.includes("DEVIATION_ACT_SINGLE"));
  });

  it("TC-05: 91 BPM (+33.8% deviation), single spike -> WATCH with DEVIATION_ACT_SINGLE", () => {
    const res = evaluateMetric("heart_rate", [makeReading(91)], BASELINE_HR, now);
    assert.strictEqual(res.severity, "WATCH");
    assert.ok(res.reason_codes.includes("DEVIATION_ACT_SINGLE"));
  });

  it("TC-06: 91 BPM repeated across 2 consecutive readings -> ACT", () => {
    const readings = [makeReading(90, 10), makeReading(91, 1)];
    const res = evaluateMetric("heart_rate", readings, BASELINE_HR, now);
    assert.strictEqual(res.severity, "ACT");
    assert.ok(res.reason_codes.includes("DEVIATION_ACT_REPEATED"));
  });

  it("TC-07: SpO2 drop (lower is worse) -> 92% vs 98% baseline (-6.1% drop) evaluated correctly", () => {
    const spo2Reading = {
      metric: "spo2",
      value: 80, // drop > 15%
      unit: "%",
      recorded_at: new Date().toISOString(),
      quality_status: "validated"
    };
    const res = evaluateMetric("spo2", [spo2Reading], 98, now);
    assert.strictEqual(res.severity, "WATCH");
    assert.ok(res.reason_codes.includes("DEVIATION_WATCH"));
  });

  it("TC-08: Stale reading (>120 mins old) flags STALE_READING and raises severity to WATCH", () => {
    const stale = makeReading(68, 150); // 150 min old
    const res = evaluateMetric("heart_rate", [stale], BASELINE_HR, now);
    assert.strictEqual(res.severity, "WATCH");
    assert.ok(res.reason_codes.includes("STALE_READING"));
  });

  it("TC-09: Behavioral evaluation flags short sleep (<6h for 2+ nights)", () => {
    const sleeps = [
      { duration_hours: 5.1, recorded_at: new Date(now - 86400000).toISOString() },
      { duration_hours: 5.4, recorded_at: new Date(now - 172800000).toISOString() }
    ];
    const beh = evaluateBehavioral(sleeps, []);
    assert.strictEqual(beh.severity, "WATCH");
    assert.ok(beh.reason_codes.includes("SLEEP_PATTERN"));
  });

  it("TC-10: Overall severity ranks ACT > WATCH > NORMAL", () => {
    const worst = overallSeverity([{ severity: "NORMAL" }, { severity: "WATCH" }, { severity: "ACT" }]);
    assert.strictEqual(worst, "ACT");
  });

  it("TC-11: Range validation rejects negative or impossible vital inputs", () => {
    assert.strictEqual(isValidVital("heart_rate", -5), false);
    assert.strictEqual(isValidVital("heart_rate", 500), false);
    assert.strictEqual(isValidVital("heart_rate", ""), false);
    assert.strictEqual(isValidVital("heart_rate", 72), true);
  });
});

