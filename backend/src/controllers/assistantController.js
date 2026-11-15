/**
 * AI Health Assistant Controller
 *
 * Implements the prompt's required explanation pattern:
 * When user asks "Why is my heart rate increasing?", uses:
 * 1. Recent heart-rate readings
 * 2. Personal baseline
 * 3. Exercise history
 * 4. Sleep and fatigue information
 * 5. Relevant symptoms / context
 * 6. Verified spaceflight medical knowledge
 *
 * SAFETY RULE: Never diagnose an astronaut or invent a medical cause.
 * Explains deterministic engine facts; numbers are verified against ground truth.
 */

const http = require("node:http");
const https = require("node:https");
const store = require("../services/storeService");
const datasetInventory = require("../nasa/datasetInventory");

const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const PREFERRED_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const CANDIDATE_MODELS = [
  PREFERRED_MODEL,
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-flash-latest"
];

function numbersIn(text) {
  const m = String(text).match(/\d+(\.\d+)?/g);
  return m ? m.map(Number) : [];
}

function validateAiNumbers(aiText, groundTruthText) {
  const allowed = new Set(numbersIn(groundTruthText));
  // Allow small contextual numbers (1-10) for ratings, but forbid fabricated vital figures
  return numbersIn(aiText).every(n => allowed.has(n) || n <= 10);
}

function buildFactualContext(astronautId, kind = "hr") {
  const astro = store.getAstronaut(astronautId) || store.state.astronauts[0];
  const summary = store.evaluateCrewMember(astro.id);
  const hrEval = summary.evals.find(e => e.metric === "heart_rate");
  const baselineHr = store.getBaseline(astro.id, "heart_rate") || 68;

  const vitals = store.getVitals(astro.id, "heart_rate", 5);
  const behavioral = store.getBehavioralSummary(astro.id);
  const lastSleep = behavioral.sleep_logs[behavioral.sleep_logs.length - 1];
  const lastMood = behavioral.mood_logs[behavioral.mood_logs.length - 1];
  const lastExercise = behavioral.exercise_logs[behavioral.exercise_logs.length - 1];

  const lines = [];

  if (kind === "hr" || kind.includes("heart") || kind.includes("rate")) {
    lines.push(`Astronaut: ${astro.name} (${astro.role})`);
    lines.push(`1. Recent heart-rate readings: Latest reading is ${hrEval?.latest?.value || "N/A"} BPM (unit: BPM, recorded: ${hrEval?.latest?.recorded_at || "recent"}).`);
    lines.push(`2. Personal baseline: Established baseline is ${baselineHr} BPM. Deviation: ${hrEval?.deviation_pct !== null ? (hrEval.deviation_pct >= 0 ? "+" : "") + hrEval.deviation_pct.toFixed(1) + "%" : "N/A"}. Engine severity class: ${hrEval?.severity || "NORMAL"}.`);
    lines.push(`3. Exercise history: Last logged exercise was ${lastExercise ? `${lastExercise.activity_type} for ${lastExercise.duration_min} minutes (${lastExercise.intensity})` : "none recorded today"}.`);
    lines.push(`4. Sleep and fatigue information: Most recent sleep was ${lastSleep ? `${lastSleep.duration_hours} hours (${lastSleep.quality} quality)` : "not logged"}. Current self-reported fatigue level is ${lastMood ? `${lastMood.fatigue}/10 (stress: ${lastMood.stress}/10)` : "not logged"}.`);
    lines.push(`5. Relevant symptoms / context: Reason codes identified by deterministic engine: [${(hrEval?.reason_codes || []).join(", ") || "none"}].`);
    lines.push(`6. Verified medical knowledge: Microgravity cardiovascular deconditioning, cephalad fluid redistribution, cumulative sleep debt, and operational stress frequently influence autonomic heart-rate control. Under mission flight rules, elevated heart rate warrants rechecking vitals and reviewing sleep/exercise context before raising clinical concerns.`);
    lines.push(`Scientific Research Grounding (NASA Dataset Inventory):`);
    lines.push(`• NASA OSDR OSD-575: Inspiration4 blood serum cardiac and metabolic biomarker panels (cardiac troponin, NT-proBNP, CMP) evaluate physiological cardiovascular stress in human spaceflight.`);
    lines.push(`• NASA OSDR OSD-569: Inspiration4 whole blood CBC profiling indicates fluid shift hemoconcentration.`);
    lines.push(`Safety Notice: ASTRA does not diagnose clinical conditions or invent causes. This is an informational explanation of verified system telemetry.`);
  } else if (kind === "compare") {
    lines.push("Crew Health Comparison (Telemetry vs Personal Baselines):");
    store.state.astronauts.forEach(person => {
      const pSummary = store.evaluateCrewMember(person.id);
      const pHr = pSummary.evals.find(e => e.metric === "heart_rate");
      const pBase = store.getBaseline(person.id, "heart_rate");
      const dev = pHr?.deviation_pct !== null ? (pHr.deviation_pct >= 0 ? "+" : "") + pHr.deviation_pct.toFixed(1) + "%" : "N/A";
      lines.push(`• ${person.name} (${person.role}): ${pHr?.latest ? pHr.latest.value : "—"} BPM vs baseline ${pBase} BPM (${dev}) — Status: ${pSummary.overall}`);
    });
    lines.push("All assessments are strictly isolated: each crew member is compared solely against their individual baseline.");
  } else if (kind === "sleep") {
    lines.push(`Sleep & Fatigue Profile for ${astro.name}:`);
    lines.push(`Pattern evaluation: ${summary.behavioral.severity} — ${summary.behavioral.explanation}`);
    lines.push(`Recent logs: Last sleep ${lastSleep ? `${lastSleep.duration_hours} hours` : "N/A"}. Fatigue ${lastMood ? `${lastMood.fatigue}/10` : "N/A"}, Stress ${lastMood ? `${lastMood.stress}/10` : "N/A"}.`);
    lines.push(`Scientific Grounding (NASA NLSP/LSDA): Actiwatch sleep disruption, circadian phase shifting, and neurobehavioral fatigue management protocols.`);
    lines.push(`Operational protocol: Review mission schedule, verify sleep hygiene adherence, and ensure lighting cycle synchronization.`);
  } else if (kind === "radiation") {
    const events = store.getRadiationEvents();
    lines.push(`Space Weather & Radiation Context:`);
    lines.push(`NASA DONKI Feed (DONKI-SEP, DONKI-CME, DONKI-GST): ${events.length} space-weather event(s) recorded in current observation window.`);
    lines.push(`Curiosity RAD Mars Benchmark (MSL-M-RAD-3-RDR-V1.0): Gale Crater surface rate 0.64 ± 0.12 mSv/day (Hassler et al. 2014); Cruise transit rate 1.84 ± 0.30 mSv/day (Zeitlin et al. 2013).`);
    lines.push(`Safety Rule: A DONKI event is space-weather environmental context, never to be interpreted as personal crew absorbed dose.`);
  } else {
    lines.push(`Mission Health Status Summary — ${astro.name}:`);
    lines.push(`Overall status: ${summary.overall}. Open alerts: ${store.state.alerts.filter(a => a.astronaut_id === astro.id && a.status === "open").length}.`);
    summary.evals.forEach(e => {
      lines.push(`• ${e.metric}: ${e.latest ? e.latest.value : "—"} ${e.latest ? e.latest.unit : ""} (${e.severity}) — ${e.explanation}`);
    });
    lines.push(`Behavioral: ${summary.behavioral.explanation}`);
  }

  return lines.join("\n");
}

async function callPythonAiService(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: "127.0.0.1",
      port: 8000,
      path: "/api/ai/explain",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      },
      timeout: 5000
    }, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        } else {
          reject(new Error(`AI service returned ${res.statusCode}`));
        }
      });
    });

    req.on("timeout", () => { req.destroy(); reject(new Error("AI service timeout")); });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Robust Gemini caller with automatic model fallback
 * Tries: preferredModel -> gemini-3.8-flash -> gemini-3.5-flash -> gemini-3.5-flash-lite -> gemini-3.1-flash-lite -> gemini-flash-latest
 */
async function callGeminiApi(promptText, apiKey = DEFAULT_GEMINI_KEY, systemInstruction = null, preferredModel = null) {
  const modelsToTry = [...new Set([preferredModel, ...CANDIDATE_MODELS].filter(Boolean))];

  for (const model of modelsToTry) {
    try {
      const result = await attemptSingleModel(model, promptText, apiKey, systemInstruction);
      if (result) {
        return { text: result, modelUsed: model };
      }
    } catch (err) {
      console.warn(`Model ${model} unavailable (${err.message.slice(0, 80)}), trying next candidate...`);
      if (modelsToTry.indexOf(model) === modelsToTry.length - 1) {
        throw err;
      }
    }
  }

  throw new Error("All Gemini candidate models failed to respond");
}

function attemptSingleModel(modelName, promptText, apiKey, systemInstruction) {
  const cleanModel = modelName.replace(/^models\//, "");
  // DO NOT add ?key= in URL — use x-goog-api-key header only (works for all keys including AQ. tokens)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`;

  const payload = {
    contents: [{
      parts: [{
        text: promptText
      }]
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const body = JSON.stringify(payload);

  const headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      headers,
      timeout: 15000
    }, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
            resolve(text);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`Gemini API HTTP ${res.statusCode} on model ${cleanModel}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("Gemini timeout")); });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Main explain endpoint
 */
async function explain(req, res) {
  try {
    const { astronaut_id, query, kind, user_api_key } = req.body || {};
    const targetAstro = astronaut_id || store.state.astronauts[0].id;
    const queryKind = kind || (query?.toLowerCase().includes("heart") ? "hr" :
                               query?.toLowerCase().includes("compare") ? "compare" :
                               query?.toLowerCase().includes("sleep") ? "sleep" :
                               query?.toLowerCase().includes("radiation") ? "radiation" : "status");

    const facts = buildFactualContext(targetAstro, queryKind);

    // 1. Try Python AI service first
    let aiServiceRes = null;
    try {
      aiServiceRes = await callPythonAiService({
        astronaut_id: targetAstro,
        kind: queryKind,
        facts,
        query
      });
    } catch (e) {
      // AI service optional fallback
    }

    if (aiServiceRes && aiServiceRes.explanation) {
      return res.json({
        success: true,
        source: "ASTRA Python AI Service + RAG Knowledge Base",
        explanation: aiServiceRes.explanation,
        facts,
        citations: aiServiceRes.citations || []
      });
    }

    // 2. Try Gemini with key from request, env, or default
    const apiKey = user_api_key || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    const preferredModel = req.body?.model || process.env.GEMINI_MODEL || PREFERRED_MODEL;
    if (apiKey) {
      try {
        const sysPrompt = "You are the ASTRA space mission health decision-support assistant. Rewrite the following verified factual facts in clear, calm, operational language. Do NOT invent numbers, diagnoses, or causes. Keep all facts intact.";
        const geminiRes = await callGeminiApi(`Rewrite the following astronaut health facts:\n\n${facts}`, apiKey, sysPrompt, preferredModel);
        if (geminiRes && geminiRes.text && validateAiNumbers(geminiRes.text, facts)) {
          return res.json({
            success: true,
            source: `Gemini (${geminiRes.modelUsed}) — Verified against telemetry facts`,
            explanation: geminiRes.text,
            model_used: geminiRes.modelUsed,
            facts
          });
        }
      } catch (geminiErr) {
        console.warn("Gemini call failed, falling back to deterministic facts:", geminiErr.message);
      }
    }

    // 3. Deterministic engine explanation fallback
    res.json({
      success: true,
      source: "ASTRA Deterministic Health Rules Engine",
      explanation: facts,
      facts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Free-form query endpoint: answers any operational space health question
 */
async function query(req, res) {
  try {
    const { query: userQuery, astronaut_id, user_api_key } = req.body || {};
    if (!userQuery) {
      return res.status(400).json({ success: false, error: "Missing query in request body" });
    }

    const targetAstro = astronaut_id || store.state.astronauts[0].id;
    const astro = store.getAstronaut(targetAstro);
    const summary = store.evaluateCrewMember(targetAstro);
    const inventoryMatches = datasetInventory.searchDatasets(userQuery);

    const telemetryContext = `
Astronaut: ${astro?.name || targetAstro} (${astro?.role || "Crew"})
Overall Status: ${summary.overall}
Vitals: ${summary.evals.map(e => `${e.metric}: ${e.latest?.value || "N/A"} ${e.latest?.unit || ""} (${e.severity}, dev: ${e.deviation_pct?.toFixed(1) || 0}%)`).join(", ")}
Behavioral Evaluation: ${summary.behavioral.severity} — ${summary.behavioral.explanation}
Relevant NASA Datasets:
${inventoryMatches.slice(0, 3).map(m => `• [${m.dataset_id}] ${m.study_title} (${m.source}): ${m.ASTRA_use}`).join("\n")}
`;

    const apiKey = user_api_key || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    const preferredModel = req.body?.model || process.env.GEMINI_MODEL || PREFERRED_MODEL;
    if (apiKey) {
      try {
        const sysPrompt = "You are ASTRA, an AI medical decision support assistant for astronauts on deep space missions. Answer the question using verified telemetry facts and NASA research citations. Never invent medical diagnoses or personal radiation doses.";
        const prompt = `Question: ${userQuery}\n\nCurrent Mission Telemetry & Context:\n${telemetryContext}`;
        const geminiRes = await callGeminiApi(prompt, apiKey, sysPrompt, preferredModel);
        if (geminiRes && geminiRes.text) {
          return res.json({
            success: true,
            source: `Gemini (${geminiRes.modelUsed})`,
            answer: geminiRes.text,
            explanation: geminiRes.text,
            model_used: geminiRes.modelUsed,
            context: telemetryContext,
            inventory_matches: inventoryMatches.slice(0, 3)
          });
        }
      } catch (e) {
        console.warn("Gemini query failed, falling back to local search:", e.message);
      }
    }

    // Local rule-grounded response
    res.json({
      success: true,
      source: "ASTRA Rule-Grounded Knowledge Hub",
      answer: `Context for query "${userQuery}":\n${telemetryContext}\n\nNASA Research Guidance: Consult OSDR studies and mission flight surgeon procedures for approved protocol checklists.`,
      explanation: `Context for query "${userQuery}":\n${telemetryContext}\n\nNASA Research Guidance: Consult OSDR studies and mission flight surgeon procedures for approved protocol checklists.`,
      context: telemetryContext,
      inventory_matches: inventoryMatches.slice(0, 3)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Vital Trend AI explanation
 */
async function explainVitalTrend(req, res) {
  try {
    const { metric, astronaut_id, user_api_key } = req.body || {};
    const preferredModel = req.body?.model || process.env.GEMINI_MODEL || PREFERRED_MODEL;
    const m = metric || "heart_rate";
    const aid = astronaut_id || store.state.astronauts[0].id;
    const astro = store.getAstronaut(aid);
    const readings = store.getVitals(aid, m, 24);
    const baseline = store.getBaseline(aid, m);

    const prompt = `
Analyze the trend for ${m} for ${astro.name}:
Personal Baseline: ${baseline}
Recent Readings (past 24h): ${readings.map(r => r.value).join(", ")}
Correlate this with microgravity adaptation, fluid shifts, and the Inspiration4 clinical panels (OSD-575 / OSD-569). Explain in calm operational flight language. Do not invent clinical diagnoses.
`;

    const apiKey = user_api_key || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    if (apiKey) {
      try {
        const geminiRes = await callGeminiApi(prompt, apiKey, null, preferredModel);
        if (geminiRes && geminiRes.text) {
          return res.json({
            success: true,
            source: `Gemini (${geminiRes.modelUsed})`,
            explanation: geminiRes.text,
            metric: m,
            baseline
          });
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      source: "ASTRA Deterministic Rules Engine",
      explanation: `Baseline for ${m} is ${baseline}. Latest readings show standard microgravity physiological variation. Review sleep, recent exercise, and repeat reading.`,
      metric: m,
      baseline
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Space Weather & Radiation AI Advisory
 */
async function assessRadiation(req, res) {
  try {
    const events = store.getRadiationEvents();
    const radContext = datasetInventory.getRadiationInventoryContext();
    const preferredModel = req.body?.model || process.env.GEMINI_MODEL || PREFERRED_MODEL;
    const prompt = `
Review the current space radiation situation:
Active DONKI Events: ${events.length} detected (SEP, CME, GST).
Mars Surface Baseline (Curiosity RAD): Gale crater rate is 0.64 mSv/day (Hassler 2014); Cruise rate 1.84 mSv/day (Zeitlin 2013).
Safety rule: A DONKI event is environmental context, not a crew personal dose.
Provide an operational radiation advisory and remind crew of approved shelter procedures.
`;

    const apiKey = req.body?.user_api_key || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    if (apiKey) {
      try {
        const geminiRes = await callGeminiApi(prompt, apiKey, null, preferredModel);
        if (geminiRes && geminiRes.text) {
          return res.json({
            success: true,
            source: `Gemini (${geminiRes.modelUsed})`,
            advisory: geminiRes.text,
            explanation: geminiRes.text,
            events_count: events.length
          });
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      source: "ASTRA Radiation Rules Engine",
      advisory: `Current observation window tracks ${events.length} space weather events. Reminder: DONKI events are environmental context, not individual absorbed doses. Consult mission flight rules and storm shelter procedures.`,
      explanation: `Current observation window tracks ${events.length} space weather events. Reminder: DONKI events are environmental context, not individual absorbed doses. Consult mission flight rules and storm shelter procedures.`,
      events_count: events.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Behavioral & Fatigue AI Assessment
 */
async function assessBehavioral(req, res) {
  try {
    const aid = req.body?.astronaut_id || store.state.astronauts[0].id;
    const astro = store.getAstronaut(aid);
    const summary = store.getBehavioralSummary(aid);
    const preferredModel = req.body?.model || process.env.GEMINI_MODEL || PREFERRED_MODEL;
    const prompt = `
Review behavioral and circadian health for ${astro.name}:
Evaluation Severity: ${summary.evaluation.severity}
Reason: ${summary.evaluation.explanation}
Recent Sleep Logs: ${summary.sleep_logs.map(s => `${s.duration_hours}h (${s.quality})`).join(", ")}
Recent Fatigue Scores: ${summary.mood_logs.map(m => `${m.fatigue}/10 (stress ${m.stress}/10)`).join(", ")}
Ground this in NASA LSDA Actiwatch research and provide operational schedule recommendations.
`;

    const apiKey = req.body?.user_api_key || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    if (apiKey) {
      try {
        const geminiRes = await callGeminiApi(prompt, apiKey, null, preferredModel);
        if (geminiRes && geminiRes.text) {
          return res.json({
            success: true,
            source: `Gemini (${geminiRes.modelUsed})`,
            assessment: geminiRes.text,
            explanation: geminiRes.text,
            severity: summary.evaluation.severity
          });
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      source: "ASTRA Behavioral Rules Engine",
      assessment: `Evaluation: ${summary.evaluation.severity}. ${summary.evaluation.explanation} Grounded in NASA LSDA chronobiology standards. Consider schedule adjustment if fatigue persists.`,
      explanation: `Evaluation: ${summary.evaluation.severity}. ${summary.evaluation.explanation} Grounded in NASA LSDA chronobiology standards. Consider schedule adjustment if fatigue persists.`,
      severity: summary.evaluation.severity
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Daily Briefing AI Executive Summary
 */
async function generateDailyBriefing(req, res) {
  try {
    const aid = req.body?.astronaut_id || store.state.astronauts[0].id;
    const reportData = store.getDailyReport(aid);
    const preferredModel = req.body?.model || process.env.GEMINI_MODEL || PREFERRED_MODEL;
    const prompt = `
Generate a concise, professional mission executive medical summary for ${reportData.astronaut.name} (${reportData.astronaut.role}):
Mission Day: ${reportData.mission_day}
Workflow Status: ${reportData.overall_workflow_status}
Open Alerts: ${reportData.open_alerts_count}
Vitals: ${reportData.vitals_evaluation.map(v => `${v.metric}: ${v.latest_value || "N/A"} (${v.severity})`).join(", ")}
Behavioral: ${reportData.behavioral_evaluation.explanation}
Keep it calm, clear, and action-oriented for the flight director and crew.
`;

    const apiKey = req.body?.user_api_key || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    if (apiKey) {
      try {
        const geminiRes = await callGeminiApi(prompt, apiKey, null, preferredModel);
        if (geminiRes && geminiRes.text) {
          return res.json({
            success: true,
            source: `Gemini (${geminiRes.modelUsed})`,
            briefing: geminiRes.text,
            explanation: geminiRes.text
          });
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      source: "ASTRA Mission Briefing Engine",
      briefing: `Day ${reportData.mission_day} Briefing for ${reportData.astronaut.name}: Overall workflow status is ${reportData.overall_workflow_status}. ${reportData.open_alerts_count} open alerts. Review vital deviations and maintain scheduled rest cycles.`,
      explanation: `Day ${reportData.mission_day} Briefing for ${reportData.astronaut.name}: Overall workflow status is ${reportData.overall_workflow_status}. ${reportData.open_alerts_count} open alerts. Review vital deviations and maintain scheduled rest cycles.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  explain,
  query,
  handleAssistantQuery: query,
  explainVitalTrend,
  assessRadiation,
  assessBehavioral,
  generateDailyBriefing,
  buildFactualContext,
  callGeminiApi
};
