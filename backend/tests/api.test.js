/**
 * Backend Data & Ingestion Integration Tests
 */

const assert = require("node:assert");
const { describe, it } = require("node:test");
const store = require("../src/services/storeService");
const { getRadResearchContext } = require("../src/nasa/radClient");
const { getLsdaCatalogue } = require("../src/nasa/lsdaClient");

describe("ASTRA Backend Store & Dataset Integration", () => {
  it("Pre-seeds 4 demo astronauts matching Day-142 mission specs", () => {
    const crew = store.getAstronauts();
    assert.strictEqual(crew.length, 4);
    assert.strictEqual(crew[0].role, "Commander");
    assert.strictEqual(crew[1].role, "Flight Engineer");
    assert.strictEqual(crew[2].role, "Mission Specialist");
    assert.strictEqual(crew[3].role, "Payload Specialist");
  });

  it("Day-142 telemetry triggers ACT for Crew Member A (Commander)", () => {
    const summary = store.evaluateCrewMember("ast-1");
    assert.strictEqual(summary.overall, "ACT");
    const hr = summary.evals.find(e => e.metric === "heart_rate");
    assert.ok(hr.deviation_pct > 30);
  });

  it("Personal baseline comparison isolates crew members independently", () => {
    const sumA = store.evaluateCrewMember("ast-1");
    const sumB = store.evaluateCrewMember("ast-2");
    assert.strictEqual(sumA.overall, "ACT");
    assert.strictEqual(sumB.overall, "NORMAL");
  });

  it("Records carry required provenance metadata (data_origin, quality_status, timestamps)", () => {
    const vitals = store.getVitals("ast-1", "heart_rate", 5);
    assert.ok(vitals.length > 0);
    const v = vitals[0];
    assert.ok(v.data_origin === "SIMULATED" || v.data_origin === "MANUAL");
    assert.ok(v.quality_status);
    assert.ok(v.recorded_at);
    assert.ok(v.unit);
  });

  it("Curiosity RAD context includes Hassler 2014 & Zeitlin 2013 citations", () => {
    const rad = getRadResearchContext();
    assert.strictEqual(rad.source_name, "Curiosity RAD (MSL) — PDS Archive");
    assert.strictEqual(rad.published_measurements.length, 2);
    assert.ok(rad.published_measurements[0].citation.includes("Hassler"));
    assert.ok(rad.published_measurements[1].citation.includes("Zeitlin"));
  });

  it("NASA LSDA provides structured catalogue and research topic mappings", () => {
    const lsda = getLsdaCatalogue();
    assert.ok(lsda.research_areas.length >= 4);
    assert.ok(lsda.portal_url.includes("lsdahome"));
  });

  it("Manual vital addition re-evaluates deterministic engine alerts", () => {
    const reading = store.addVital({
      astronaut_id: "ast-2",
      metric: "heart_rate",
      value: 72,
      unit: "BPM",
      data_origin: "MANUAL",
      quality_status: "validated"
    });
    assert.ok(reading.id);
    assert.strictEqual(reading.data_origin, "MANUAL");
    assert.strictEqual(reading.value, 72);
  });

  it("Behavioral check-in accepts sleep, mood, fatigue, and exercise", () => {
    const sleep = store.addSleepLog({
      astronaut_id: "ast-2",
      duration_hours: 8.0,
      quality: "good"
    });
    assert.strictEqual(sleep.duration_hours, 8.0);

    const mood = store.addMoodLog({
      astronaut_id: "ast-2",
      mood: 9,
      stress: 2,
      fatigue: 2
    });
    assert.strictEqual(mood.mood, 9);
  });
});

