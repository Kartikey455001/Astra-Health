# ASTRA HEALTH — Test Execution Record

**Date:** 13 Nov 2026 (IST) · **Build:** zip v2 (mission-command redesign) + live page (muse.ai/s/astra-health)
**Environment:** Node test harness (engine/validation), live NASA APIs, Chromium browser pass on the published page
**Checklist:** ASTRA_HEALTH_Complete_Testing_Checklist.pdf

## Summary

| Area | Result |
|---|---|
| §5 Engine boundary tests TC-01…TC-12 | **12/12 PASS** (automated, 15 assertions) |
| §4 Input validation | PASS after fix (defect D1 found & fixed in zip; live fix in progress) |
| §6 NASA API integration | **PASS** — DONKI SEP/FLR/CME, OSDR, NTRS all live-verified |
| §7 Radiation integrity | **PASS** — DONKI never shown as dose; RAD labelled Mars research context |
| §9 AI assistant | 5 PASS, 1 FAIL → fixed in zip, live fix in progress (D2) |
| §8 Behavioral health | PASS in zip; live FAIL → fix in progress (D3) |
| §2 UI/UX + §14 Day-142 scenario | **PASS** — A ACT, B NORMAL, C WATCH, D NORMAL |
| §10 Offline | PARTIAL — labels/cache verified; true network-off toggle NOT RUN |
| §11 Reports | **PASS** — daily report with timestamps, units, provenance; alert history present |
| §12 Security | **PASS** (code review) — no hardcoded secrets; Gemini key memory-only; output escaping on |
| §3 Auth | NOT APPLICABLE to the prototype (no accounts by design; blueprint phase-2 item) |
| §13 Performance/compat | PARTIAL — Chromium verified, no console errors in audit; Edge/Firefox NOT RUN |

Local automated tests: **54/54 pass** (`node tests/rules.test.js` 27 · `tests/checklist.test.js` 15 · `tests/validation.test.js` 12).

## §5 Boundary tests (baseline 68 BPM) — automated

| Test | Input | Expected | Actual | Status |
|---|---|---|---|---|
| TC-01 | 68 BPM (0%) | NORMAL | NORMAL | PASS |
| TC-02 | 75 BPM (+10.3%) | NORMAL | NORMAL | PASS |
| TC-03 | 78.2 BPM (+15%) | WATCH | WATCH | PASS |
| TC-04 | 88.4 BPM (+30%), single | RECHECK | RECHECK (WATCH + single-spike reason) | PASS |
| TC-05 | 89 BPM (+30.9%), first | RECHECK | RECHECK | PASS |
| TC-06 | 91 BPM (+33.8%), first | RECHECK | RECHECK | PASS |
| TC-07 | 91 BPM, repeat confirmed | ACT | ACT | PASS |
| TC-08 | 80 BPM (+17.6%), repeated | WATCH | WATCH | PASS |
| TC-09 | Missing value | Reject / incomplete | Form rejects empty; engine flags NO_DATA (never NORMAL) | PASS |
| TC-10 | Negative value | Reject input | **Was FAIL → FIXED**: plausible-range validation (HR 20–250, SpO₂ 50–100, BP 50–260, temp 25–45, resp 2–80) at form + store layer | PASS after fix |
| TC-11 | Baseline = 0 | Reject invalid baseline | Engine handles safely: deviation null, NO_BASELINE flag, no crash | PASS |
| TC-12 | Same reading twice | Prevent duplicate | Single reading can never self-confirm ACT; alerts deduplicated (same crew+metric+severity within 30 min) | PASS |

## §6 NASA API integration — live evidence (13 Nov 2026)

| Source | Evidence | Status |
|---|---|---|
| DONKI SEP | Endpoint live; returned `[]` for 14 Oct–13 Nov (no SEP events occurred) — empty handled, nothing substituted | PASS |
| DONKI FLR | Real events returned (M1.1–M1.9 flares, 7–11 Nov, GOES) with IDs + times | PASS |
| DONKI CME | 21 events returned with activityIDs | PASS |
| OSDR | 339 studies for "bone loss" (OSD-661, OSD-310…); real field names verified ("Study Title", "Accession") — zip parser corrected to match | PASS |
| NTRS | Search live (164 results via portal; API endpoint per blueprint) | PASS |
| RAD / LSDA | Portal/archive links only (no API in the blueprint) — RAD values shown are published, cited figures (Hassler 2014; Zeitlin 2013), labelled research context | PASS |
| Failure handling | fetch errors surface an error state; last cache shown labelled with retrieval time, never as live | PASS (code + observed empty state) |
| HTTP 429/500, malformed JSON drills | Not executed against NASA production (would require fault injection) | NOT RUN |

## Live-page browser QA (13 Nov 2026, 20:41–20:43 IST)

| # | Test | Status | Evidence |
|---|---|---|---|
| 1 | Crew states Day-142 | PASS | A 91 BPM ACT (+33.8%), B 72 NORMAL, C 79 WATCH (+16.2%), D 66 NORMAL; pills "2 Normal · 1 Watch · 1 Act" |
| 2 | AI: is DONKI the astronaut's dose? | PASS | "What it is not: a measurement of any astronaut's dose… ASTRA never converts a DONKI event into a personal dose" |
| 3 | AI: user asks to downgrade alert | PASS | Refused; ACT stands, engine cited |
| 4 | AI: compare Crew A vs B | **FAIL → fix in progress (D2)** | Answered Crew A only; no Crew B values |
| 5 | Input validation −5 BPM | **FAIL → FIXED in zip; live fix in progress (D1)** | Live page accepted −5 and evaluated it (−107.4%, RECHECK). Empty value was rejected |
| 6 | Daily report | PASS | All four crew with HR/baseline/deviation/class, timestamps, units, SIMULATED/MANUAL/NASA_PUBLIC labels; alert history = 4 entries |
| 7 | Behavioral per-crew isolation | **FAIL → fix in progress (D3)** | Switching the check-in selector to Crew B left the summary on Crew A (zip version switches correctly) |
| 8 | Offline/STALE labelling | PASS (labels) | "Offline Mode Ready", STALE defined as cached-data label; no record was stale during the pass; true offline run NOT RUN |

## Defects

| ID | Defect | Severity | Status |
|---|---|---|---|
| D1 | Negative/impossible vital values accepted (live page; zip had the same gap at form level) | High for a health UI | FIXED in zip (validation tests 12/12) and on the live page — **retested PASS 13 Nov 20:45–20:46 IST**: −5 rejected with "Invalid reading — not recorded", valid 72 accepted normally |
| D2 | Assistant comparison answers only one crew member | Medium | FIXED in zip (compare view added) and on the live page — **retested PASS**: both crew values with units, baseline, deviation and engine class |
| D3 | Behavioral Health summary does not follow crew selector (live page) | Medium | FIXED on the live page — **retested PASS**: switching to Crew B shows B's own records (sleep 7.4 h, mood 7.8/10). Zip was never affected |

## §16 Acceptance criteria check

- Engine boundary tests pass — **YES**
- At least one NASA source retrieves real data — **YES** (DONKI FLR/CME, OSDR, NTRS)
- NASA vs simulated data visibly distinguished — **YES**
- DONKI/RAD never misrepresented as crew dose — **YES**
- Offline health monitoring works — **PARTIAL** (local engine + storage by design; network-off rehearsal still to run before demo)
- AI cannot override the engine — **YES** (tested with a direct downgrade request)
- No known critical security issue — **YES** (review; no backend, no stored secrets)
- Day-142 scenario completes — **YES**

**Recommended before the final demo:** (1) retest D1–D3 on the live page after the fix publishes; (2) run the §10 offline rehearsal once on the demo device (load page → airplane mode → confirm dashboard + engine + STALE labels); (3) rehearse §14 end-to-end from a clean session.
