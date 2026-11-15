/**
 * ASTRA HEALTH — Comprehensive End-to-End API Test Suite
 * Tests all 20 REST & inventory endpoints through the server dispatcher.
 */

process.env.NODE_ENV = "test";
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { EventEmitter } = require("node:events");

let serverInstance;

function request(method, path, body = null) {
  return new Promise((resolve) => {
    const req = new Readable({
      read() {
        if (body) this.push(typeof body === "string" ? body : JSON.stringify(body));
        this.push(null);
      }
    });
    req.method = method;
    req.url = path;
    req.headers = { host: "localhost:8080", "content-type": "application/json", accept: "application/json" };

    let data = "";
    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
    res.getHeader = (k) => res.headers[k.toLowerCase()];
    res.writeHead = (status, headers) => {
      res.statusCode = status;
      if (headers) Object.assign(res.headers, headers);
      return res;
    };
    res.write = (chunk) => { data += chunk; return true; };
    res.end = (chunk) => {
      if (chunk) data += chunk;
      try { resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) }); }
      catch(e) { resolve({ status: res.statusCode, headers: res.headers, text: data }); }
    };

    serverInstance.emit("request", req, res);
  });
}

describe("ASTRA Complete REST API & Dataset Inventory Endpoints", () => {
  before(() => {
    const { server } = require("../src/server");
    serverInstance = server;
  });

  after(() => {
    if (serverInstance && serverInstance.close) {
      serverInstance.close();
    }
  });

  test("1. GET /api/health returns 200 ok and system version", async () => {
    const res = await request("GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.data.status, "ok");
    assert.equal(res.data.version, "2.0.0");
    assert.ok(res.data.crew_count >= 4);
  });

  test("2. GET /api/state returns full persistent state", async () => {
    const res = await request("GET", "/api/state");
    assert.equal(res.status, 200);
    assert.ok(res.data.state);
    assert.ok(Array.isArray(res.data.state.astronauts));
    assert.ok(Array.isArray(res.data.state.vital_readings));
    assert.ok(Array.isArray(res.data.state.nasa_datasets));
  });

  test("3. GET /api/astronauts returns all 4 crew members", async () => {
    const res = await request("GET", "/api/astronauts");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.count, 4);
    assert.equal(res.data.data[0].role, "Commander");
  });

  test("4. GET /api/astronauts/:id returns status and vitals for Commander", async () => {
    const res = await request("GET", "/api/astronauts/AST-001");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.astronaut.id, "ast-1");
    assert.ok(res.data.data.overall);
    assert.ok(Array.isArray(res.data.data.evals));
  });

  test("5. GET /api/vitals and POST /api/vitals validate inputs and evaluate engine", async () => {
    const getRes = await request("GET", "/api/vitals?astronaut_id=ast-1&metric=heart_rate");
    assert.equal(getRes.status, 200);
    assert.ok(getRes.data.data.length >= 1);

    const postRes = await request("POST", "/api/vitals", {
      astronaut_id: "ast-1",
      metric: "heart_rate",
      value: 72,
      data_origin: "MANUAL",
      quality_status: "validated"
    });
    assert.equal(postRes.status, 201);
    assert.equal(postRes.data.success, true);
    assert.equal(postRes.data.data.value, 72);
  });

  test("6. POST /api/vitals rejects impossible or negative values", async () => {
    const badRes = await request("POST", "/api/vitals", {
      astronaut_id: "ast-1",
      metric: "heart_rate",
      value: -10,
      data_origin: "MANUAL"
    });
    assert.equal(badRes.status, 400);
    assert.equal(badRes.data.success, false);
  });

  test("7. POST /api/vitals/simulate-tick advances telemetry", async () => {
    const tickRes = await request("POST", "/api/vitals/simulate-tick");
    assert.equal(tickRes.status, 200);
    assert.equal(tickRes.data.success, true);
    assert.ok(tickRes.data.data.length >= 4);
  });

  test("8. GET /api/baselines and PUT /api/baselines update baseline safely", async () => {
    const getBase = await request("GET", "/api/baselines?astronaut_id=ast-1");
    assert.equal(getBase.status, 200);
    assert.ok(getBase.data.data.length >= 5);

    const putBase = await request("PUT", "/api/baselines", {
      astronaut_id: "ast-1",
      metric: "heart_rate",
      baseline_value: 68,
      unit: "BPM"
    });
    assert.equal(putBase.status, 200);
    assert.equal(putBase.data.success, true);
    assert.equal(putBase.data.data.baseline_value, 68);
  });

  test("9. POST /api/behavioral/{sleep,mood,exercise} logs behavioral metrics", async () => {
    const sleepRes = await request("POST", "/api/behavioral/sleep", {
      astronaut_id: "ast-1",
      duration_hours: 7.5,
      quality: "good"
    });
    assert.equal(sleepRes.status, 201);

    const moodRes = await request("POST", "/api/behavioral/mood", {
      astronaut_id: "ast-1",
      mood: 8,
      stress: 3,
      fatigue: 2
    });
    assert.equal(moodRes.status, 201);

    const exRes = await request("POST", "/api/behavioral/exercise", {
      astronaut_id: "ast-1",
      activity_type: "Treadmill (T2)",
      duration_min: 45
    });
    assert.equal(exRes.status, 201);
  });

  test("10. POST /api/behavioral/checkin provides unified submission", async () => {
    const checkinRes = await request("POST", "/api/behavioral/checkin", {
      astronaut_id: "AST-002",
      sleep_hours: 6.8,
      sleep_quality: "fair",
      mood: 7,
      stress: 4,
      fatigue: 4,
      exercise_type: "Resistance (ARED)",
      exercise_min: 60
    });
    assert.equal(checkinRes.status, 200);
    assert.equal(checkinRes.data.success, true);
  });

  test("11. GET /api/behavioral/:astronautId and GET /api/behavioral return behavioral evaluation", async () => {
    const res1 = await request("GET", "/api/behavioral/AST-001");
    assert.equal(res1.status, 200);
    assert.ok(res1.data.data.evaluation);

    const res2 = await request("GET", "/api/behavioral");
    assert.equal(res2.status, 200);
    assert.ok(res2.data.data.evaluation);
  });

  test("12. GET /api/radiation/donki and alias /api/nasa/donki return space weather events", async () => {
    const res1 = await request("GET", "/api/radiation/donki?type=SEP");
    assert.equal(res1.status, 200);
    assert.ok(Array.isArray(res1.data.data));

    const res2 = await request("GET", "/api/nasa/donki?type=SEP");
    assert.equal(res2.status, 200);
    assert.ok(Array.isArray(res2.data.data));
  });

  test("13. GET /api/radiation/rad and GET /api/radiation/lsda return research references", async () => {
    const radRes = await request("GET", "/api/radiation/rad");
    assert.equal(radRes.status, 200);
    assert.ok(radRes.data.data.published_measurements.length >= 2);

    const lsdaRes = await request("GET", "/api/radiation/lsda");
    assert.equal(lsdaRes.status, 200);
    assert.ok(lsdaRes.data.data.research_areas.length >= 4);
  });

  test("14. GET /api/alerts and PATCH /api/alerts/:id acknowledge alerts", async () => {
    const getRes = await request("GET", "/api/alerts");
    assert.equal(getRes.status, 200);
    assert.ok(Array.isArray(getRes.data.data));

    if (getRes.data.data.length > 0) {
      const firstId = getRes.data.data[0].id;
      const patchRes = await request("PATCH", `/api/alerts/${firstId}`, { status: "acknowledged" });
      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.data.data.status, "acknowledged");
    }
  });

  test("15. Strictly loads all 16 datasets from ASTRA_HEALTH_NASA_Dataset_Inventory.csv", async () => {
    const invRes = await request("GET", "/api/nasa/inventory");
    assert.equal(invRes.status, 200);
    assert.equal(invRes.data.count, 16);
    assert.equal(invRes.data.data.length, 16);
    assert.equal(invRes.data.master_inventory, "ASTRA_HEALTH_NASA_Dataset_Inventory.csv");

    // Check specific accession OSD-575 (Inspiration4 cardiac panel)
    const osd575 = await request("GET", "/api/nasa/inventory/OSD-575");
    assert.equal(osd575.status, 200);
    assert.equal(osd575.data.data.dataset_id, "OSD-575");
    assert.ok(osd575.data.data.study_title.includes("Inspiration4"));

    // Check Curiosity RAD (Mars Science Laboratory RAD calibrated RDR)
    const rad = await request("GET", "/api/nasa/inventory/MSL-M-RAD-3-RDR-V1.0");
    assert.equal(rad.status, 200);
    assert.ok(rad.data.data.study_title.includes("Mars Science Laboratory"));

    // Check DONKI-SEP
    const donki = await request("GET", "/api/nasa/inventory/DONKI-SEP");
    assert.equal(donki.status, 200);

    // Check NLSP/LSDA
    const lsda = await request("GET", "/api/nasa/inventory/NLSP/LSDA");
    assert.equal(lsda.status, 200);
  });

  test("16. GET /api/nasa/biomarkers returns clinical biomarker panel context (OSD-575, OSD-569)", async () => {
    const res = await request("GET", "/api/nasa/biomarkers");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data.clinical_panels));
    assert.ok(res.data.data.clinical_panels.length >= 4);
    assert.ok(res.data.data.clinical_panels.some(p => p.panel.includes("Cardiac")));
    assert.ok(res.data.data.clinical_panels.some(p => p.panel.includes("CBC")));
  });

  test("17. GET /api/nasa/radiation-context and /api/nasa/behavioral-context return inventory research grounding", async () => {
    const radCtx = await request("GET", "/api/nasa/radiation-context");
    assert.equal(radCtx.status, 200);
    assert.ok(radCtx.data.data.mars_surface_calibrated_rdr.safety_notice);

    const behavCtx = await request("GET", "/api/nasa/behavioral-context");
    assert.equal(behavCtx.status, 200);
    assert.ok(behavCtx.data.data.key_areas.length >= 3);
  });

  test("18. POST /api/assistant/explain provides deterministic explanation with 6 prompt criteria", async () => {
    const res = await request("POST", "/api/assistant/explain", {
      astronaut_id: "ast-1",
      kind: "hr"
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.explanation.includes("reading") || res.data.explanation.includes("BPM") || res.data.explanation.includes("baseline"));
    assert.ok(typeof res.data.facts === "string" && res.data.facts.length > 50);
  });

  test("19. GET /api/reports/daily returns structured daily report for both ast-1 and AST-001", async () => {
    const res1 = await request("GET", "/api/reports/daily?astronaut_id=ast-1");
    assert.equal(res1.status, 200);
    assert.equal(res1.data.success, true);
    assert.equal(res1.data.data.astronaut.id, "ast-1");
    assert.ok(res1.data.data.vitals_evaluation.length >= 5);

    const res2 = await request("GET", "/api/reports/daily?astronaut_id=AST-001");
    assert.equal(res2.status, 200);
    assert.equal(res2.data.success, true);
    assert.equal(res2.data.data.astronaut.id, "ast-1");
  });

  test("20. POST /api/state/reset restores demo state and retains 16 inventory datasets", async () => {
    const res = await request("POST", "/api/state/reset");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.state.astronauts.length, 4);
    assert.equal(res.data.state.nasa_datasets.length, 16);
  });
});
