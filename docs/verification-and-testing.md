# ASTRA HEALTH — Verification & Testing Report

## 1. Test Execution Summary

Total local automated tests: **76 PASS, 0 FAIL** across all modules:

| Test Suite | File | Checks | Result |
|---|---|---|---|
| Rule Engine Boundary | `tests/rules.test.js` | 27 | **PASS** |
| Testing Checklist | `tests/checklist.test.js` | 15 | **PASS** |
| Range Validation | `tests/validation.test.js` | 12 | **PASS** |
| Backend Health Engine | `backend/tests/engine.test.js` | 11 | **PASS** |
| Backend Store & Ingestion | `backend/tests/api.test.js` | 8 | **PASS** |
| AI Assistant Grounding | `backend/tests/ai.test.js` | 3 | **PASS** |

---

## 2. Boundary Test Matrix (Baseline 68 BPM)

| Test ID | Reading | % Deviation | Expected Severity | Actual Severity | Reason Code | Status |
|---|---|---|---|---|---|---|
| TC-01 | 68 BPM | 0.0% | NORMAL | NORMAL | None | **PASS** |
| TC-02 | 75 BPM | +10.3% | NORMAL | NORMAL | None (<15%) | **PASS** |
| TC-03 | 78.2 BPM | +15.0% | WATCH | WATCH | `DEVIATION_WATCH` | **PASS** |
| TC-04 | 88.4 BPM | +30.0% | WATCH (Single) | WATCH | `DEVIATION_ACT_SINGLE` (RECHECK) | **PASS** |
| TC-05 | 91.0 BPM | +33.8% | WATCH (Single) | WATCH | `DEVIATION_ACT_SINGLE` | **PASS** |
| TC-06 | 91.0 BPM | +33.8% (Repeat) | ACT | ACT | `DEVIATION_ACT_REPEATED` | **PASS** |
| TC-07 | SpO2 80% | -18.4% (Drop) | WATCH | WATCH | `DEVIATION_WATCH` (Inverted) | **PASS** |
| TC-08 | >120m old | Age 150m | WATCH | WATCH | `STALE_READING` | **PASS** |
| TC-09 | Sleep < 6h | 2+ nights | WATCH | WATCH | `SLEEP_PATTERN` | **PASS** |
| TC-10 | Fatigue >= 7 | 2+ checks | WATCH | WATCH | `FATIGUE_PATTERN` | **PASS** |
| TC-11 | Invalid vital | -5 BPM | Reject | Reject | Out of bounds validation | **PASS** |
| TC-12 | Impossible | 500 BPM | Reject | Reject | Out of bounds validation | **PASS** |

---

## 3. Defect Resolutions

- **Defect D1 (Form validation):** Negative/impossible vitals (−5 BPM or 500 BPM) are rejected at both form input and store layer with descriptive feedback.
- **Defect D2 (Assistant Crew Comparison):** The AI Assistant comparison query evaluates and lists all 4 crew members with their individual baselines, deviations, units, and engine classes.
- **Defect D3 (Behavioral Crew Isolation):** Switching the crew selector immediately updates both the behavioral summary and table to the selected astronaut's isolated logs.
- **Defect D4 (Gemini Model Name):** Fixed invalid endpoint `gemini-3.6-flash` to production model `gemini-2.5-flash` with backend proxy fallback.
- **Defect D5 (Browser CORS on NASA APIs):** Added backend ingestion proxies (`/api/radiation/donki`, `/api/nasa/osdr`, `/api/nasa/ntrs`) so browser never encounters CORS blocks.

