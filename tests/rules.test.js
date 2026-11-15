/* ASTRA HEALTH — rules engine tests (node tests/rules.test.js) */
const R = require("../js/rules.js");
let pass = 0, fail = 0;
function eq(actual, expected, name) {
  if (actual === expected) { pass++; }
  else { fail++; console.log("FAIL:", name, "expected", expected, "got", actual); }
}
function ok(cond, name) { eq(!!cond, true, name); }
const now = Date.now();
const iso = (minsAgo) => new Date(now - minsAgo * 60000).toISOString();
const rd = (value, minsAgo, q) => ({ value, unit: "BPM", recorded_at: iso(minsAgo), quality_status: q || "validated" });

// deviation math
eq(R.deviationPct(68, 68), 0, "zero deviation");
eq(Math.round(R.deviationPct(91, 68)), 34, "blueprint scenario 68->91 is ~34%");
eq(R.deviationPct(10, null), null, "no baseline -> null");

// no data
let e = R.evaluateMetric("heart_rate", [], 68, now);
eq(e.severity, "WATCH", "no data -> WATCH");
ok(e.reason_codes.includes("NO_DATA"), "no data reason");

// normal reading at baseline
e = R.evaluateMetric("heart_rate", [rd(69, 5)], 68, now);
eq(e.severity, "NORMAL", "at baseline -> NORMAL");

// watch band (15-30%)
e = R.evaluateMetric("heart_rate", [rd(80, 5)], 68, now); // +17.6%
eq(e.severity, "WATCH", "17.6% rise -> WATCH");
ok(e.reason_codes.includes("DEVIATION_WATCH"), "watch reason");

// single big spike -> WATCH (verify first), not ACT
e = R.evaluateMetric("heart_rate", [rd(70, 60), rd(95, 5)], 68, now); // +39.7% once
eq(e.severity, "WATCH", "single spike -> WATCH not ACT");
ok(e.reason_codes.includes("DEVIATION_ACT_SINGLE"), "single spike reason");

// repeated big deviation -> ACT (blueprint Day-142 scenario shape)
e = R.evaluateMetric("heart_rate", [rd(92, 30), rd(91, 5)], 68, now);
eq(e.severity, "ACT", "repeated +34% -> ACT");
ok(e.reason_codes.includes("DEVIATION_ACT_REPEATED"), "act reason");

// SpO2: a DROP is concerning; small drop stays NORMAL
const spo = (value, minsAgo) => ({ value, unit: "%", recorded_at: iso(minsAgo), quality_status: "validated" });
e = R.evaluateMetric("spo2", [spo(93, 5)], 98, now); // -5.1%
eq(e.severity, "NORMAL", "SpO2 -5% -> NORMAL");
e = R.evaluateMetric("spo2", [spo(82, 5)], 98, now); // -16.3%
eq(e.severity, "WATCH", "SpO2 -16% -> WATCH");
e = R.evaluateMetric("spo2", [spo(67, 30), spo(66, 5)], 98, now); // ~-32% repeated
eq(e.severity, "ACT", "SpO2 -32% repeated -> ACT");
// a RISE in SpO2 is not concerning
e = R.evaluateMetric("spo2", [spo(100, 5)], 98, now);
eq(e.severity, "NORMAL", "SpO2 rise -> NORMAL");

// stale reading escalates NORMAL -> WATCH with reason
e = R.evaluateMetric("heart_rate", [rd(68, 60 * 5)], 68, now); // 5h old
eq(e.severity, "WATCH", "stale reading -> WATCH");
ok(e.reason_codes.includes("STALE_READING"), "stale reason");

// poor quality flagged
e = R.evaluateMetric("heart_rate", [rd(68, 5, "needs review")], 68, now);
ok(e.reason_codes.includes("QUALITY_NEEDS REVIEW"), "quality reason");

// no baseline
e = R.evaluateMetric("heart_rate", [rd(70, 5)], null, now);
eq(e.severity, "NORMAL", "no baseline, clean quality -> NORMAL with NO_BASELINE");
ok(e.reason_codes.includes("NO_BASELINE"), "no baseline reason");

// behavioral: short sleep + high fatigue pattern (blueprint demo pattern)
let b = R.evaluateBehavioral(
  [{ duration_hours: 5.1 }, { duration_hours: 5.4 }, { duration_hours: 7.2 }],
  [{ fatigue: 8 }, { fatigue: 9 }, { fatigue: 3 }]);
eq(b.severity, "WATCH", "behavioral pattern -> WATCH");
ok(b.reason_codes.includes("SLEEP_PATTERN"), "sleep reason");
ok(b.reason_codes.includes("FATIGUE_PATTERN"), "fatigue reason");
b = R.evaluateBehavioral([{ duration_hours: 7.5 }, { duration_hours: 8 }], [{ fatigue: 2 }, { fatigue: 3 }]);
eq(b.severity, "NORMAL", "healthy behavioral -> NORMAL");

// overall severity picks the worst
eq(R.overallSeverity([{ severity: "NORMAL" }, { severity: "ACT" }, { severity: "WATCH" }]), "ACT", "overall worst");
eq(R.overallSeverity([]), "NORMAL", "overall empty");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
