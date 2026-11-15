/**
 * AI Assistant & Decision Support Tests
 */

const assert = require("node:assert");
const { describe, it } = require("node:test");
const { buildFactualContext } = require("../src/controllers/assistantController");

describe("ASTRA AI Assistant - Fact Grounding & Safety", () => {
  it("buildFactualContext includes the 6 prompt criteria for heart rate queries", () => {
    const facts = buildFactualContext("ast-1", "hr");

    // 1. Recent heart-rate readings
    assert.ok(facts.includes("1. Recent heart-rate readings:"));
    // 2. Personal baseline
    assert.ok(facts.includes("2. Personal baseline:"));
    // 3. Exercise history
    assert.ok(facts.includes("3. Exercise history:"));
    // 4. Sleep and fatigue information
    assert.ok(facts.includes("4. Sleep and fatigue information:"));
    // 5. Relevant symptoms / context
    assert.ok(facts.includes("5. Relevant symptoms / context:"));
    // 6. Verified spaceflight medical knowledge
    assert.ok(facts.includes("6. Verified medical knowledge:"));

    // Safety rule
    assert.ok(facts.includes("ASTRA does not diagnose"));
  });

  it("Comparison context answers for all 4 crew members (resolving Defect D2)", () => {
    const facts = buildFactualContext("ast-1", "compare");
    assert.ok(facts.includes("Crew Member A"));
    assert.ok(facts.includes("Crew Member B"));
    assert.ok(facts.includes("Crew Member C"));
    assert.ok(facts.includes("Crew Member D"));
    assert.ok(facts.includes("strictly isolated"));
  });

  it("Radiation context explicitly disclaims personal dose conversion", () => {
    const facts = buildFactualContext("ast-1", "radiation");
    assert.ok(facts.includes("Curiosity RAD"));
    assert.ok(facts.includes("never to be interpreted as personal crew absorbed dose"));
  });
});

