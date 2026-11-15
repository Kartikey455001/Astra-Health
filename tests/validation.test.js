/* ASTRA HEALTH — input validation tests (checklist TC-09/TC-10, §4). */
global.window = globalThis;
global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
require("../js/store.js");
const S = globalThis.ASTRA_STORE;
let pass = 0, fail = 0;
function eq(a, e, n) { if (a === e) pass++; else { fail++; console.log("FAIL:", n, "expected", e, "got", a); } }

eq(S.isValidVital("heart_rate", 72), true, "normal HR accepted");
eq(S.isValidVital("heart_rate", -5), false, "TC-10 negative HR rejected");
eq(S.isValidVital("heart_rate", ""), false, "TC-09 empty HR rejected");
eq(S.isValidVital("heart_rate", "abc"), false, "non-numeric HR rejected");
eq(S.isValidVital("heart_rate", 999), false, "impossible HR rejected");
eq(S.isValidVital("spo2", 98), true, "normal SpO2 accepted");
eq(S.isValidVital("spo2", 140), false, "SpO2 >100 rejected");
eq(S.isValidVital("body_temp", 36.8), true, "normal temp accepted");
eq(S.isValidVital("body_temp", -2), false, "negative temp rejected");

const state = S.load(); S.setBaselinesFromDefaults(state);
const before = state.vital_readings.length;
eq(S.addVital(state, { astronaut_id: "ast-1", metric: "heart_rate", value: -10 }), null, "addVital refuses negative");
eq(state.vital_readings.length, before, "refused reading not stored");
const good = S.addVital(state, { astronaut_id: "ast-1", metric: "heart_rate", value: 72, data_origin: "MANUAL" });
eq(!!good && good.data_origin === "MANUAL" && !!good.id && !!good.recorded_at, true, "valid reading stored with provenance + unique id");

console.log(`\nvalidation tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
