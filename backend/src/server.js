/**
 * ASTRA HEALTH — Node.js + Express + Socket.IO / SSE Server
 * NASA Space Apps Challenge 2026
 *
 * Implements:
 * - REST API with all blueprint routes and database tables
 * - Deterministic health engine alert detection
 * - NASA OSDR, DONKI, RAD, LSDA, NTRS integration
 * - AI assistant gateway (FastAPI ai-service & Gemini)
 * - Real-time streaming for live telemetry and alert notifications
 * - Static file serving for the frontend
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

// Zero-dependency .env loader
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(process.cwd(), ".env")
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const idx = trimmed.indexOf("=");
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val.replace(/^["']|["']$/g, "");
            }
          }
        }
      } catch (e) {}
    }
  }
}
loadEnv();

process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const store = require("./services/storeService");
const { corsMiddleware } = require("./middleware");

const astronautsRouter = require("./routes/astronauts");
const vitalsRouter = require("./routes/vitals");
const baselinesRouter = require("./routes/baselines");
const behavioralRouter = require("./routes/behavioral");
const radiationRouter = require("./routes/radiation");
const alertsRouter = require("./routes/alerts");
const nasaRouter = require("./routes/nasa");
const assistantRouter = require("./routes/assistant");
const reportsRouter = require("./routes/reports");

const PORT = Number(process.env.PORT || 8080);
const HOST = "0.0.0.0";
const ROOT_DIR = path.resolve(__dirname, "../..");
const FRONTEND_DIST = path.resolve(ROOT_DIR, "frontend/dist");

let app;
let server;
let io = null;

// SSE connected clients
const sseClients = new Set();

function setupStoreBroadcast() {
  store.onUpdate((event, data) => {
    // Broadcast via Socket.IO if available
    if (io) {
      io.emit(event, data);
      io.emit("telemetry_update", { event, timestamp: new Date().toISOString() });
    }
    // Broadcast via SSE to web clients
    const ssePayload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try { client.write(ssePayload); } catch (e) { sseClients.delete(client); }
    }
  });
}

// Try using standard Express if available, or fall back to resilient native dispatcher
try {
  const express = require("express");
  const cors = require("cors");
  const socketIo = require("socket.io");

  app = express();
  server = http.createServer(app);
  io = socketIo(server, { cors: { origin: "*" } });

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      version: "2.0.0",
      framework: "Express + Socket.IO",
      timestamp: new Date().toISOString(),
      crew_count: store.state.astronauts.length,
      alerts_count: store.state.alerts.length,
      gemini_configured: Boolean(process.env.GEMINI_API_KEY)
    });
  });

  app.get("/api/state", (req, res) => res.json({ state: store.state }));
  app.post("/api/state/reset", (req, res) => res.json({ success: true, state: store.reset() }));

  // SSE stream endpoint
  app.get("/api/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    res.write("event: connected\ndata: {\"connected\":true}\n\n");
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
  });

  app.use("/api/astronauts", astronautsRouter);
  app.use("/api/vitals", vitalsRouter);
  app.use("/api/baselines", baselinesRouter);
  app.use("/api/behavioral", behavioralRouter);
  app.use("/api/radiation", radiationRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/nasa", nasaRouter);
  app.use("/api/assistant", assistantRouter);
  app.use("/api/reports", reportsRouter);

  // Backward compatibility with v1 endpoints
  app.get("/api/nasa/donki", require("./controllers/radiationController").getDonkiEvents);
  app.get("/api/nasa/osdr", require("./controllers/nasaController").searchOsdrEndpoint);
  app.all("/api/nasa/ntrs", require("./controllers/nasaController").searchNtrsEndpoint);
  app.all("/api/assistant/query", require("./controllers/assistantController").query);
  app.all("/api/assistant/explain", require("./controllers/assistantController").explain);
  app.all("/api/assistant/rephrase", require("./controllers/assistantController").explain);
  app.all("/api/assistant/vital-trend", require("./controllers/assistantController").explainVitalTrend);
  app.all("/api/assistant/radiation-assessment", require("./controllers/assistantController").assessRadiation);
  app.all("/api/assistant/behavioral-assessment", require("./controllers/assistantController").assessBehavioral);
  app.all("/api/assistant/daily-briefing", require("./controllers/assistantController").generateDailyBriefing);
  app.get("/api/behavioral", require("./controllers/behavioralController").getBehavioralSummary);
  app.post("/api/behavioral/checkin", async (req, res) => {
    try {
      const { astronaut_id, sleep_hours, sleep_quality, mood, stress, fatigue, exercise_type, exercise_min } = req.body || {};
      const aid = astronaut_id || "AST-001";
      if (sleep_hours !== undefined) store.addSleepLog({ astronaut_id: aid, duration_hours: parseFloat(sleep_hours), quality: sleep_quality || "good", data_origin: "MANUAL" });
      if (mood !== undefined || stress !== undefined || fatigue !== undefined) store.addMoodLog({ astronaut_id: aid, mood: parseInt(mood || 7, 10), stress: parseInt(stress || 3, 10), fatigue: parseInt(fatigue || 2, 10), data_origin: "MANUAL" });
      if (exercise_type) store.addExerciseLog({ astronaut_id: aid, activity_type: exercise_type, duration_min: parseInt(exercise_min || 30, 10), intensity: "moderate", data_origin: "MANUAL" });
      res.json({ success: true, message: "Check-in logged", summary: store.getBehavioralSummary(aid) });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // Serve static files
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
  }
  app.use(express.static(ROOT_DIR));

  io.on("connection", (socket) => {
    socket.emit("connected", { message: "ASTRA Mission Command Socket Connected" });
    socket.on("request_state", () => {
      socket.emit("state_snapshot", store.state);
    });
    socket.on("simulate_tick", () => {
      const result = store.tickSimulation();
      io.emit("telemetry_tick", result);
    });
  });

} catch (err) {
  // Pure Node HTTP fallback: Zero-dependency runtime with full route parity
  console.log("Using native Node HTTP dispatcher (Express optional):", err.message);

  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png"
  };

  const mounts = [
    ["/api/astronauts", astronautsRouter],
    ["/api/vitals", vitalsRouter],
    ["/api/baselines", baselinesRouter],
    ["/api/behavioral", behavioralRouter],
    ["/api/radiation", radiationRouter],
    ["/api/alerts", alertsRouter],
    ["/api/nasa", nasaRouter],
    ["/api/assistant", assistantRouter],
    ["/api/reports", reportsRouter],
  ];

  function matchRoute(basePath, routePath, reqPath) {
    let full = (basePath + (routePath === "/" ? "" : routePath)).replace(/\/+$/, "") || "/";
    const paramNames = [];
    const regexPattern = "^" + full.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    }) + "/?$";
    const regex = new RegExp(regexPattern);
    const match = reqPath.match(regex);
    if (!match) return null;
    const params = {};
    paramNames.forEach((name, i) => {
      params[name] = decodeURIComponent(match[i + 1]);
    });
    return params;
  }

  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    corsMiddleware(req, res, () => {});

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
      });
      return res.end();
    }

    function sendJson(status, data) {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      });
      res.end(JSON.stringify(data));
    }

    function readBody() {
      return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
          try { resolve(JSON.parse(body || "{}")); } catch (e) { resolve({}); }
        });
        req.on("error", reject);
      });
    }

    try {
      // 1. Top-level status & real-time SSE stream
      if (url.pathname === "/api/health") {
        return sendJson(200, {
          status: "ok",
          version: "2.0.0",
          framework: "Node.js Native HTTP",
          timestamp: new Date().toISOString(),
          crew_count: store.state.astronauts.length,
          alerts_count: store.state.alerts.length
        });
      }

      if (url.pathname === "/api/state" && req.method === "GET") {
        return sendJson(200, { state: store.state });
      }

      if (url.pathname === "/api/state/reset" && req.method === "POST") {
        return sendJson(200, { success: true, state: store.reset() });
      }

      if (url.pathname === "/api/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*"
        });
        res.write("event: connected\ndata: {\"connected\":true}\n\n");
        sseClients.add(res);
        req.on("close", () => sseClients.delete(res));
        return;
      }

      // 2. Behavioral check-in endpoint (unified form)
      if (url.pathname === "/api/behavioral/checkin" && req.method === "POST") {
        const body = await readBody();
        const { astronaut_id, sleep_hours, sleep_quality, mood, stress, fatigue, exercise_type, exercise_min } = body;
        const aid = astronaut_id || "AST-001";
        if (sleep_hours !== undefined) store.addSleepLog({ astronaut_id: aid, duration_hours: parseFloat(sleep_hours), quality: sleep_quality || "good", data_origin: "MANUAL" });
        if (mood !== undefined || stress !== undefined || fatigue !== undefined) store.addMoodLog({ astronaut_id: aid, mood: parseInt(mood || 7, 10), stress: parseInt(stress || 3, 10), fatigue: parseInt(fatigue || 2, 10), data_origin: "MANUAL" });
        if (exercise_type) store.addExerciseLog({ astronaut_id: aid, activity_type: exercise_type, duration_min: parseInt(exercise_min || 30, 10), intensity: "moderate", data_origin: "MANUAL" });
        return sendJson(200, { success: true, message: "Check-in logged", summary: store.getBehavioralSummary(aid) });
      }

      // 3. Backward-compatibility & special path aliases
      if (url.pathname.startsWith("/api/nasa/inventory/") && req.method === "GET") {
        const rawId = url.pathname.replace(/^\/api\/nasa\/inventory\//, "");
        const id = decodeURIComponent(rawId);
        const mockReq = { params: { id }, query: Object.fromEntries(url.searchParams) };
        const mockRes = { json: d => sendJson(200, d), status: s => ({ json: d => sendJson(s, d) }) };
        return require("./controllers/nasaController").getDatasetById(mockReq, mockRes);
      }

      if (url.pathname === "/api/nasa/donki") {
        const mockReq = { query: Object.fromEntries(url.searchParams) };
        const mockRes = { json: d => sendJson(200, d), status: s => ({ json: d => sendJson(s, d) }) };
        return await require("./controllers/radiationController").getDonkiEvents(mockReq, mockRes);
      }

      if (url.pathname === "/api/behavioral" && req.method === "GET") {
        const mockReq = { params: {}, query: Object.fromEntries(url.searchParams) };
        const mockRes = { json: d => sendJson(200, d), status: s => ({ json: d => sendJson(s, d) }) };
        return require("./controllers/behavioralController").getBehavioralSummary(mockReq, mockRes);
      }

      // Fast-path AI Assistant handlers
      if (url.pathname.startsWith("/api/assistant/")) {
        const sub = url.pathname.replace(/^\/api\/assistant\//, "");
        const assistantCtrl = require("./controllers/assistantController");
        const bData = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody() : {};
        const mockReq = {
          method: req.method,
          headers: req.headers,
          url: req.url,
          query: Object.fromEntries(url.searchParams),
          params: {},
          body: bData
        };
        const mockRes = {
          statusCode: 200,
          status(code) { this.statusCode = code; return this; },
          json(data) { sendJson(this.statusCode || 200, data); }
        };

        if (sub === "query") return await assistantCtrl.query(mockReq, mockRes);
        if (sub === "explain" || sub === "rephrase") return await assistantCtrl.explain(mockReq, mockRes);
        if (sub === "vital-trend") return await assistantCtrl.explainVitalTrend(mockReq, mockRes);
        if (sub === "radiation-assessment") return await assistantCtrl.assessRadiation(mockReq, mockRes);
        if (sub === "behavioral-assessment") return await assistantCtrl.assessBehavioral(mockReq, mockRes);
        if (sub === "daily-briefing") return await assistantCtrl.generateDailyBriefing(mockReq, mockRes);
      }

      // 4. Dispatch to mounted route modules
      let bodyData = null;
      for (const [basePath, router] of mounts) {
        const routes = router._routes || [];
        for (const route of routes) {
          if (route.method !== "ALL" && route.method !== req.method) continue;
          const params = matchRoute(basePath, route.path, url.pathname);
          if (params !== null) {
            if (bodyData === null && ["POST", "PUT", "PATCH"].includes(req.method)) {
              bodyData = await readBody();
            }
            const mockReq = {
              method: req.method,
              headers: req.headers,
              url: req.url,
              query: Object.fromEntries(url.searchParams),
              params,
              body: bodyData || {}
            };
            let statusCode = 200;
            const mockRes = {
              status(code) {
                statusCode = code;
                return this;
              },
              json(data) {
                sendJson(statusCode, data);
              },
              send(data) {
                res.writeHead(statusCode, {
                  "Content-Type": "text/plain; charset=utf-8",
                  "Access-Control-Allow-Origin": "*"
                });
                res.end(data);
              }
            };
            return await route.handler(mockReq, mockRes);
          }
        }
      }

      // 5. Static file serving fallback
      const relPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
      let target = path.resolve(ROOT_DIR, `.${relPath}`);

      if (!fs.existsSync(target) && fs.existsSync(FRONTEND_DIST)) {
        target = path.resolve(FRONTEND_DIST, `.${relPath}`);
      }

      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        const ext = path.extname(target);
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "X-Content-Type-Options": "nosniff"
        });
        return fs.createReadStream(target).pipe(res);
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Route or static file not found", path: url.pathname }));
    } catch (routeErr) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: routeErr.message }));
    }
  });
}

setupStoreBroadcast();

function start(port = PORT, host = HOST) {
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 ASTRA HEALTH Backend running at http://localhost:${port}`);
      console.log(`🛰️  Mission Orion-1 Live Telemetry & NASA Gateway Online`);
      console.log(`======================================================\n`);
      resolve(server);
    });
  });
}

const isDirectOrRootServer = require.main === module || (require.main && /[\\/]server\.js$/i.test(require.main.filename) && !require.main.filename.includes("test"));
if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT && isDirectOrRootServer) {
  start();
}

module.exports = { app, server, start };

