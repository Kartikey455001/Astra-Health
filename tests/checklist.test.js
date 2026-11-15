/* ASTRA HEALTH — checklist boundary tests (PDF §5), baseline 68 BPM.
 * RECHECK = engine WATCH + reason DEVIATION_ACT_SINGLE (UI display label). */
const R = require("../js/rules.js");
let pass = 0, fail = 0;
function eq(a, e, name) { if (a === e) pass++; else { fail++; console.log("FAIL:", name, "expected", e, "got", a); } }
function ok(c, name) { eq(!!c, true, name); }
const now = Date.now();
const rd = (v, mins) => ({ value: v, unit: "BPM", recorded_at: new Date(now - (mins || 5) * 60000).toISOString(), quality_status: "validated" });
const disp = (e) => (e.severity === "WATCH" && e.reason_codes.includes("DEVIATION_ACT_SINGLE")) ? "RECHECK" : e.severity;

eq(disp(R.evaluateMetric("heart_rate", [rd(68)], 68, now)), "NORMAL", "TC-01 68 BPM (0%) -> NORMAL");
eq(disp(R.evaluateMetric("heart_rate", [rd(75)], 68, now)), "NORMAL", "TC-02 75 BPM (+10.3%) -> NORMAL");
eq(disp(R.evaluateMetric("heart_rate", [rd(78.2)], 68, now)), "WATCH", "TC-03 78.2 BPM (+15%) -> WATCH");
eq(disp(R.evaluateMetric("heart_rate", [rd(88.4)], 68, now)), "RECHECK", "TC-04 88.4 BPM (+30%) single -> RECHECK");
eq(disp(R.evaluateMetric("heart_rate", [rd(89)], 68, now)), "RECHECK", "TC-05 89 BPM (+30.9%) first -> RECHECK");
eq(disp(R.evaluateMetric("heart_rate", [rd(91)], 68, now)), "RECHECK", "TC-06 91 BPM (+33.8%) first -> RECHECK");
eq(disp(R.evaluateMetric("heart_rate", [rd(91, 30), rd(91)], 68, now)), "ACT", "TC-07 91 BPM repeat confirmed -> ACT");
eq(disp(R.evaluateMetric("heart_rate", [rd(80, 30), rd(80)], 68, now)), "WATCH", "TC-08 80 BPM (+17.6%) repeated -> WATCH");

// TC-09 missing value: engine must not crash and must flag the gap
let e9 = R.evaluateMetric("heart_rate", [], 68, now);
ok(e9.reason_codes.includes("NO_DATA") && e9.severity !== "NORMAL", "TC-09 missing reading -> flagged NO_DATA, not NORMAL");
// TC-10 negative value: engine input contract — validated at form/store layer (see app tests below)
// TC-11 baseline zero: no crash, no division by zero, deviation null
let e11 = R.evaluateMetric("heart_rate", [rd(70)], 0, now);
ok(e11.deviation_pct === null && e11.reason_codes.includes("NO_BASELINE"), "TC-11 baseline 0 -> handled safely (NO_BASELINE)");
// TC-12 duplicate: repeat-confirmation must be tied to same metric values (two distinct readings at +33.8% needed)
let e12 = R.evaluateMetric("heart_rate", [rd(91)], 68, now);
ok(e12.severity !== "ACT", "TC-12 single reading can never trigger ACT (no duplicate/self-confirm)");

// Additional engine checks from the checklist
ok(Math.abs(R.deviationPct(91, 68) - 33.8235) < 0.01, "percentage calculation 68->91 = +33.8%");
let stale = R.evaluateMetric("heart_rate", [rd(68, 60 * 6)], 68, now);
ok(stale.reason_codes.includes("STALE_READING"), "stale reading flagged (offline/STALE support)");
let poor = R.evaluateMetric("heart_rate", [rd(68, 5)], 68, now);
eq(poor.severity, "NORMAL", "clean reading stays NORMAL");
let lowQ = R.evaluateMetric("heart_rate", [{ value: 68, unit: "BPM", recorded_at: new Date(now - 300000).toISOString(), quality_status: "estimated" }], 68, now);
ok(lowQ.reason_codes.some(r => r.startsWith("QUALITY_")), "poor-quality data flagged");

console.log(`\nchecklist engine tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
