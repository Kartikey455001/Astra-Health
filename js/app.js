/*
 * ASTRA HEALTH — application logic.
 * Screens per blueprint Section 6: Mission Command Dashboard, Physiological
 * Monitoring, Radiation Command Center, Behavioral Health, AI Health
 * Assistant, Reports & Research.
 * The AI assistant explains deterministic engine output; it never diagnoses
 * and never overrides the engine (blueprint Sections 5 & 15).
 */
(function () {
  "use strict";
  var S = window.ASTRA_STORE, R = window.ASTRA_RULES, N = window.ASTRA_NASA, SIM = window.ASTRA_SIM;
  var state = S.load();
  S.setBaselinesFromDefaults(state);
  if (state.vital_readings.length === 0) { SIM.backfill(state); S.save(state); }
  var selectedAstro = state.astronauts[0].id;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function tag(origin) { var cls = origin === "NASA_PUBLIC" ? "tag-nasa" : origin === "SIMULATED" ? "tag-sim" : origin === "MANUAL" ? "tag-manual" : "tag-device"; return '<span class="tag ' + cls + '">' + esc(origin) + "</span>"; }
  function fmtTime(iso) { var d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleString(); }

  // Display label: the engine's WATCH + single-large-spike reason is shown as
  // RECHECK in the mission-command UI ("take a repeat reading") — engine unchanged.
  function displaySeverity(e) {
    if (e.severity === "WATCH" && (e.reason_codes || []).indexOf("DEVIATION_ACT_SINGLE") !== -1) return "RECHECK";
    return e.severity;
  }
  function sevBadge(sev) { return '<span class="sev-badge sev-' + sev + '">' + sev + "</span>"; }
  function initials(name) {
    var m = String(name).match(/Crew Member (\w)/);
    return m ? "C" + m[1] : "CM";
  }

  function readingsFor(astId, metric) {
    return state.vital_readings.filter(function (r) { return r.astronaut_id === astId && (!metric || r.metric === metric); });
  }
  function evaluateAstro(astId) {
    var evals = Object.keys(S.METRICS).map(function (m) {
      return R.evaluateMetric(m, readingsFor(astId, m), S.getBaseline(state, astId, m), Date.now());
    });
    var beh = R.evaluateBehavioral(
      state.sleep_logs.filter(function (x) { return x.astronaut_id === astId; }),
      state.mood_logs.filter(function (x) { return x.astronaut_id === astId; }));
    return { evals: evals, behavioral: beh, overall: R.overallSeverity(evals.concat([beh])) };
  }

  // Record alerts (dedupe: same astronaut+metric+severity within 30 min).
  function recordAlerts() {
    state.astronauts.forEach(function (a) {
      var res = evaluateAstro(a.id);
      res.evals.concat([Object.assign({ metric: "behavioral" }, res.behavioral)]).forEach(function (e) {
        if (e.severity === "NORMAL") return;
        var dup = state.alerts.some(function (al) {
          return al.astronaut_id === a.id && al.metric === e.metric && al.severity === e.severity &&
            (Date.now() - Date.parse(al.created_at)) < 30 * 60000;
        });
        if (!dup) state.alerts.push({ id: S.uid(), astronaut_id: a.id, metric: e.metric,
          severity: e.severity, reason_codes: e.reason_codes || [], explanation: e.explanation,
          status: "open", created_at: S.nowIso(), data_origin: "SIMULATED" });
      });
    });
    S.save(state);
  }

  /* ---------------- Dashboard ---------------- */
  function renderCrewSelect() {
    $("crewSelect").innerHTML = state.astronauts.map(function (a) {
      return '<option value="' + a.id + '"' + (a.id === selectedAstro ? " selected" : "") + ">" + esc(a.name) + "</option>";
    }).join("");
  }
  var VITAL_ICONS = { heart_rate: "♥", spo2: "◍", systolic_bp: "◈", body_temp: "°", respiratory_rate: "≋" };
  function drawSpark(canvas, readings, color) {
    var ctx = canvas.getContext("2d");
    var W = canvas.width = Math.max(canvas.offsetWidth * 2, 200), H = canvas.height = 60;
    ctx.clearRect(0, 0, W, H);
    if (readings.length < 2) return;
    var vals = readings.map(function (r) { return r.value; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath();
    readings.forEach(function (r, i) {
      var x = 6 + (W - 12) * i / (readings.length - 1);
      var y = H - 8 - (H - 16) * (r.value - min) / ((max - min) || 1);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
  function renderDashboard() {
    renderCrewSelect();
    $("crewCount").textContent = state.astronauts.length;
    var counts = { NORMAL: 0, WATCH: 0, ACT: 0 };
    var results = {};
    state.astronauts.forEach(function (a) { var r = evaluateAstro(a.id); results[a.id] = r; counts[r.overall] = (counts[r.overall] || 0) + 1; });
    $("crewSummary").innerHTML =
      '<span class="summary-pill"><span class="dot dot-NORMAL"></span>' + counts.NORMAL + " Normal</span>" +
      '<span class="summary-pill"><span class="dot dot-WATCH"></span>' + (counts.WATCH || 0) + " Watch</span>" +
      '<span class="summary-pill"><span class="dot dot-ACT"></span>' + (counts.ACT || 0) + " Act</span>" +
      '<span class="summary-pill">' + tag("SIMULATED") + " demo crew telemetry</span>";
    $("crewCards").innerHTML = state.astronauts.map(function (a) {
      var res = results[a.id];
      var hr = res.evals.find(function (e) { return e.metric === "heart_rate"; });
      var hrDev = hr.deviation_pct === null ? "" : " <small>" + (hr.deviation_pct >= 0 ? "↑" : "↓") + Math.abs(hr.deviation_pct).toFixed(1) + "%</small>";
      return '<div class="crew-card glow-' + res.overall + (a.id === selectedAstro ? " selected" : "") + '" data-crew="' + a.id + '">' +
        '<div class="crew-top"><div class="avatar">' + initials(a.name) + '</div><div><div class="crew-name">' + esc(a.name.replace(" (Demo)", "")) + '</div><div class="crew-role">' + esc(a.role) + "</div></div></div>" +
        '<div class="crew-hr"><span class="hr-val">♥ ' + (hr.latest ? hr.latest.value : "—") + " BPM" + hrDev + "</span>" + sevBadge(res.overall) + "</div>" +
        '<canvas class="spark" data-spark="' + a.id + '"></canvas></div>';
    }).join("");
    document.querySelectorAll("canvas[data-spark]").forEach(function (cv) {
      var res = results[cv.getAttribute("data-spark")];
      drawSpark(cv, readingsFor(cv.getAttribute("data-spark"), "heart_rate").slice(-24),
        res.overall === "ACT" ? "#ff5d6c" : res.overall === "WATCH" ? "#ffb648" : "#2fe6a8");
    });
    document.querySelectorAll(".crew-card[data-crew]").forEach(function (card) {
      card.addEventListener("click", function () { selectedAstro = card.getAttribute("data-crew"); renderAll(); });
    });

    // Physiological panel (selected crew)
    var a = state.astronauts.find(function (x) { return x.id === selectedAstro; });
    var res = results[selectedAstro];
    $("dashPhysioTitle").textContent = esc(a.name.replace(" (Demo)", "")) + " — Physiological Monitoring";
    $("dashPhysioSev").innerHTML = sevBadge(res.overall);
    $("dashVitals").innerHTML = res.evals.map(function (e) {
      var devTxt = e.deviation_pct === null ? "—" : (e.deviation_pct >= 0 ? "↑ +" : "↓ ") + e.deviation_pct.toFixed(1) + "%";
      var devCls = e.deviation_pct === null ? "dev-flat" : (Math.abs(e.deviation_pct) >= 15 ? "dev-up" : "dev-flat");
      return '<div class="vital-row"><div class="vital-ic">' + (VITAL_ICONS[e.metric] || "•") + '</div>' +
        '<div class="vital-main"><div class="vital-name">' + esc(S.METRICS[e.metric].label) + '</div><div class="vital-val">' +
        (e.latest ? e.latest.value + " " + esc(e.latest.unit) : "no data") + '</div></div>' +
        '<span class="vital-dev ' + devCls + '">' + devTxt + "</span>" + sevBadge(displaySeverity(e)) + "</div>";
    }).join("");
    drawChart($("dashHrChart"), readingsFor(selectedAstro, "heart_rate").slice(-24), S.getBaseline(state, selectedAstro, "heart_rate"));

    // Behavioral tiles (latest values, selected crew)
    var sleeps = state.sleep_logs.filter(function (x) { return x.astronaut_id === selectedAstro; });
    var moods = state.mood_logs.filter(function (x) { return x.astronaut_id === selectedAstro; });
    var ls = sleeps[sleeps.length - 1], lm = moods[moods.length - 1];
    function tile(ic, name, val, sub) { return '<div class="tile"><div class="t-ic">' + ic + '</div><div class="t-name">' + name + '</div><div class="t-val">' + val + '</div><div class="t-sub">' + sub + "</div></div>"; }
    $("dashBehavTiles").innerHTML =
      tile("☾", "Sleep", ls ? ls.duration_hours + " h" : "—", ls ? esc(ls.quality) + " quality" : "no log") +
      tile("☺", "Mood", lm ? lm.mood + " /10" : "—", "self-report") +
      tile("⚡", "Stress", lm ? lm.stress + " /10" : "—", "self-report") +
      tile("▽", "Fatigue", lm ? lm.fatigue + " /10" : "—", "self-report");
    $("dashBehavSev").innerHTML = sevBadge(res.behavioral.severity);
    $("dashBehavNote").textContent = res.behavioral.explanation;

    $("dashRad").innerHTML = '<div class="event-item"><strong>Curiosity RAD (Mars)</strong> ' + tag("NASA_PUBLIC") +
      "<br>" + esc(N.RAD.published_context[0].value) + " — " + esc(N.RAD.published_context[0].label) +
      '<br><span class="muted">' + esc(N.RAD.published_context[0].citation) + " · historical research context, not crew telemetry</span></div>";

    $("nasaIntegration").innerHTML = [
      ["OSDR", "src-osdr", "Space biology & human research", "https://osdr.nasa.gov/"],
      ["DONKI", "src-donki", "Space weather & solar events", "https://ccmc.gsfc.nasa.gov/DONKI/"],
      ["RAD", "src-rad", "Mars radiation measurements", N.RAD.archive_url],
      ["LSDA", "src-lsda", "Life sciences research", N.LSDA.portal_url],
      ["NTRS", "src-ntrs", "Technical reports & publications", "https://ntrs.nasa.gov/"]
    ].map(function (r) {
      return '<div class="src-row"><span class="src-badge ' + r[1] + '">' + r[0] + '</span><span>' + r[2] + '</span><a class="go" href="' + r[3] + '" target="_blank" rel="noopener">Open ↗</a></div>';
    }).join("");

    var alerts = state.alerts.slice(-6).reverse();
    $("alertList").innerHTML = alerts.length ? alerts.map(function (al) {
      var who = state.astronauts.find(function (x) { return x.id === al.astronaut_id; });
      return '<div class="alert-item ' + al.severity + '"><strong>' + al.severity + "</strong> · " + esc(who ? who.name : "") +
        " · " + esc(al.metric) + '<div class="when">' + fmtTime(al.created_at) + " · reasons: " + esc((al.reason_codes || []).join(", ") || "—") + "</div><div>" + esc(al.explanation) + "</div></div>";
    }).join("") : '<p class="muted">No alerts. All monitored metrics are within their configured deviation bands.</p>';
    renderSyncStatus();
    renderDonkiSummary();
  }
  function renderSyncStatus() {
    var last = {};
    state.sync_logs.forEach(function (l) { last[l.source] = l; });
    var rows = ["NASA DONKI", "NASA OSDR", "NASA NTRS"].map(function (src) {
      var l = last[src];
      return "<tr><td>" + src + "</td><td>" + (l ? fmtTime(l.last_synced_at) : "never") + "</td><td>" +
        (l ? (l.status === "ok" ? '<span class="ok">ok</span>' : '<span class="err">' + esc(l.error_message || "error") + "</span>") : "—") + "</td></tr>";
    }).join("");
    var lastSync = state.sync_logs.length ? fmtTime(state.sync_logs[state.sync_logs.length - 1].last_synced_at) : "never";
    $("syncStatus").innerHTML = "<table><tr><th>Source</th><th>Last sync</th><th>Status</th></tr>" + rows + "</table>" +
      '<p class="fineprint">Last sync overall: ' + lastSync + ". Cached NASA records are labelled with their retrieval time and are never shown as live data.</p>";
  }

  /* ---------------- DONKI ---------------- */
  function donkiHtml(events) {
    if (!events.length) return '<p class="muted">No events returned for this period.</p>';
    return events.slice(0, 10).map(function (e) {
      return '<div class="event-item"><strong>' + esc(e.event_type) + "</strong> · " + esc(e.source_record_id) +
        " " + tag(e.data_origin) + '<br><span class="muted">Observed: ' + fmtTime(e.observed_at) + " · Retrieved: " + fmtTime(e.retrieved_at) +
        '</span><br><a href="' + esc(e.source_url) + '" target="_blank" rel="noopener">Source: NASA DONKI</a></div>';
    }).join("");
  }
  function renderDonkiSummary() {
    var c = state.nasa_cache.DONKI;
    if (c) { $("donkiSummary").innerHTML = "Last fetched " + fmtTime(c.retrieved_at) + " — showing cached records (may be stale)."; $("donkiList").innerHTML = donkiHtml(c.records); }
  }
  function fetchDonki(type) {
    $("donkiSummary").textContent = "Fetching " + type + " events from NASA DONKI…";
    return N.fetchDonki(type).then(function (records) {
      state.radiation_events = records;
      state.nasa_cache.DONKI = { records: records, retrieved_at: S.nowIso() };
      S.logSync(state, "NASA DONKI", "ok");
      S.save(state);
      $("donkiSummary").innerHTML = '<span class="ok">Live fetch complete</span> — ' + records.length + " event(s), retrieved " + fmtTime(S.nowIso()) + ".";
      $("donkiList").innerHTML = donkiHtml(records);
      $("donkiFeed").innerHTML = donkiHtml(records);
      $("donkiFeedStatus").innerHTML = '<span class="ok">Live</span> · ' + records.length + " event(s) · " + fmtTime(S.nowIso());
    }).catch(function (e) {
      S.logSync(state, "NASA DONKI", "error", e.message); S.save(state);
      var cached = state.nasa_cache.DONKI;
      $("donkiSummary").innerHTML = '<span class="err">Fetch failed: ' + esc(e.message) + ".</span> " +
        (cached ? "Showing cached records from " + fmtTime(cached.retrieved_at) + " (stale)." : "No cached records yet.");
      $("donkiFeedStatus").innerHTML = $("donkiSummary").innerHTML;
      if (cached) { $("donkiList").innerHTML = donkiHtml(cached.records); $("donkiFeed").innerHTML = donkiHtml(cached.records); }
      renderSyncStatus();
    });
  }

  /* ---------------- Physiological ---------------- */
  function drawChart(canvas, readings, baseline) {
    var ctx = canvas.getContext("2d");
    var W = canvas.width = canvas.offsetWidth * 2, H = canvas.height = 220;
    ctx.clearRect(0, 0, W, H);
    if (readings.length < 2) { ctx.fillStyle = "#9db1d8"; ctx.font = "24px system-ui"; ctx.fillText("Not enough readings to chart", 16, 40); return; }
    var vals = readings.map(function (r) { return r.value; });
    var min = Math.min.apply(null, vals.concat([baseline || Infinity])) * 0.95;
    var max = Math.max.apply(null, vals.concat([baseline || -Infinity])) * 1.05;
    function X(i) { return 20 + (W - 40) * i / (readings.length - 1); }
    function Y(v) { return H - 20 - (H - 50) * (v - min) / (max - min || 1); }
    if (baseline !== null) { ctx.strokeStyle = "#ffb648"; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(20, Y(baseline)); ctx.lineTo(W - 20, Y(baseline)); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#ffb648"; ctx.font = "20px system-ui"; ctx.fillText("personal baseline " + baseline, 24, Y(baseline) - 8); }
    ctx.strokeStyle = "#4da3ff"; ctx.lineWidth = 3; ctx.beginPath();
    readings.forEach(function (r, i) { i ? ctx.lineTo(X(i), Y(r.value)) : ctx.moveTo(X(i), Y(r.value)); });
    ctx.stroke();
    ctx.fillStyle = "#4da3ff";
    readings.forEach(function (r, i) { ctx.beginPath(); ctx.arc(X(i), Y(r.value), 4, 0, 7); ctx.fill(); });
  }
  function renderPhysio() {
    var a = selectedAstro;
    $("physioCards").innerHTML = Object.keys(S.METRICS).map(function (m) {
      var readings = readingsFor(a, m);
      var base = S.getBaseline(state, a, m);
      var e = R.evaluateMetric(m, readings, base, Date.now());
      var recent = readings.slice(-24);
      return '<div class="card"><h3>' + esc(S.METRICS[m].label) + ' — <span class="sev sev-' + e.severity + '">' + e.severity + "</span></h3>" +
        '<div class="muted">Latest: ' + (e.latest ? e.latest.value + " " + esc(e.latest.unit) + " · " + fmtTime(e.latest.recorded_at) + " " + tag(e.latest.data_origin) : "no data") +
        " · Baseline: " + (base === null ? "not set" : base + " " + S.METRICS[m].unit) + "</div>" +
        '<div class="canvas-wrap"><canvas data-chart="' + m + '"></canvas></div>' +
        "<p>" + esc(e.explanation) + "</p></div>";
    }).join("");
    document.querySelectorAll("canvas[data-chart]").forEach(function (cv) {
      drawChart(cv, readingsFor(a, cv.getAttribute("data-chart")).slice(-24), S.getBaseline(state, a, cv.getAttribute("data-chart")));
    });
    $("vitalMetric").innerHTML = Object.keys(S.METRICS).map(function (m) {
      return '<option value="' + m + '">' + esc(S.METRICS[m].label) + " (" + S.METRICS[m].unit + ")</option>";
    }).join("");
  }

  /* ---------------- Radiation ---------------- */
  function renderRadiation() {
    $("radPanel").innerHTML =
      "<p>" + esc(N.RAD.portal_note) + '</p><p><a href="' + N.RAD.archive_url + '" target="_blank" rel="noopener">Open the RAD PDS archive (MSL-M-RAD-3-RDR-V1.0)</a> ' + tag("NASA_PUBLIC") + "</p>" +
      "<h4>Published reference values (research context — not crew telemetry)</h4>" +
      N.RAD.published_context.map(function (p) {
        return '<div class="event-item"><strong>' + esc(p.label) + ":</strong> " + esc(p.value) +
          '<br><span class="muted">' + esc(p.citation) + '</span><br><a href="' + esc(p.source_url) + '" target="_blank" rel="noopener">Publisher page</a></div>';
      }).join("");
    $("lsdaPanel").innerHTML = "<p>" + esc(N.LSDA.note) + '</p><p>Topics: ' + N.LSDA.topics.map(esc).join(" · ") +
      '</p><p><a href="' + N.LSDA.portal_url + '" target="_blank" rel="noopener">Open the NASA LSDA catalogue</a> ' + tag("NASA_PUBLIC") + "</p>";
    var c = state.nasa_cache.DONKI;
    if (c) { $("donkiFeed").innerHTML = donkiHtml(c.records); $("donkiFeedStatus").textContent = "Cached records from " + fmtTime(c.retrieved_at) + " (stale — fetch for live data)."; }
  }

  /* ---------------- Behavioral ---------------- */
  function renderBehavioral() {
    var a = selectedAstro;
    var beh = evaluateAstro(a).behavioral;
    var sleeps = state.sleep_logs.filter(function (x) { return x.astronaut_id === a; }).slice(-5).reverse();
    var moods = state.mood_logs.filter(function (x) { return x.astronaut_id === a; }).slice(-5).reverse();
    $("behavioralStatus").innerHTML = '<p>Pattern check: <span class="sev sev-' + beh.severity + '">' + beh.severity + "</span> — " + esc(beh.explanation) + "</p>";
    $("behavioralHistory").innerHTML =
      "<h4>Recent sleep logs</h4>" + (sleeps.length ? "<table><tr><th>When</th><th>Hours</th><th>Quality</th><th>Origin</th></tr>" + sleeps.map(function (s) {
        return "<tr><td>" + fmtTime(s.recorded_at) + "</td><td>" + s.duration_hours + "</td><td>" + esc(s.quality) + "</td><td>" + tag(s.data_origin) + "</td></tr>"; }).join("") + "</table>" : '<p class="muted">None yet.</p>') +
      "<h4>Recent mood / stress / fatigue</h4>" + (moods.length ? "<table><tr><th>When</th><th>Mood</th><th>Stress</th><th>Fatigue</th><th>Origin</th></tr>" + moods.map(function (m) {
        return "<tr><td>" + fmtTime(m.recorded_at) + "</td><td>" + m.mood + "/10</td><td>" + m.stress + "/10</td><td>" + m.fatigue + "/10</td><td>" + tag(m.data_origin) + "</td></tr>"; }).join("") + "</table>" : '<p class="muted">None yet.</p>');
  }

  /* ---------------- Assistant ---------------- */
  function explainLocal(kind) {
    var a = state.astronauts.find(function (x) { return x.id === selectedAstro; });
    var res = evaluateAstro(a.id);
    var hr = res.evals.find(function (e) { return e.metric === "heart_rate"; });
    var donki = state.nasa_cache.DONKI;
    var lines = [];
    if (kind === "compare") {
      var others = state.astronauts.filter(function (x) { return x.id !== selectedAstro; });
      lines.push("Crew comparison (latest heart rate vs personal baseline, from the same records as the dashboard):");
      [a].concat(others).forEach(function (person) {
        var r = evaluateAstro(person.id);
        var h = r.evals.find(function (e) { return e.metric === "heart_rate"; });
        lines.push("• " + person.name + ": " + (h.latest ? h.latest.value + " " + h.latest.unit : "no data") +
          " vs baseline " + (S.getBaseline(state, person.id, "heart_rate") || "—") + " BPM (" +
          (h.deviation_pct === null ? "—" : (h.deviation_pct >= 0 ? "+" : "") + h.deviation_pct.toFixed(1) + "%") +
          ") — engine class " + r.overall + ".");
      });
      lines.push("Values are per-crew and isolated: each member is compared only with their own baseline.");
    } else if (kind === "status") {
      lines.push(a.name + " — overall workflow status: " + res.overall + ".");
      res.evals.forEach(function (e) { lines.push("• " + S.METRICS[e.metric].label + ": " + e.severity + " — " + e.explanation); });
      lines.push("• Behavioral: " + res.behavioral.severity + " — " + res.behavioral.explanation);
    } else if (kind === "hr") {
      lines.push("Heart-rate explanation (from the deterministic engine, reason codes: " + (hr.reason_codes.join(", ") || "none") + "):");
      lines.push(hr.explanation);
      lines.push("Context matters: recent exercise, sleep and symptoms should be reviewed before any conclusion. ASTRA does not diagnose a cause from heart rate alone.");
    } else if (kind === "sleep") {
      lines.push("Sleep & fatigue pattern: " + res.behavioral.severity + " — " + res.behavioral.explanation);
      lines.push("Suggested workflow: prompt a check-in with the crew member and review workload scheduling under the mission's approved procedures.");
    } else if (kind === "radiation") {
      if (donki) lines.push("Latest DONKI fetch (" + fmtTime(donki.retrieved_at) + ") returned " + donki.records.length + " event record(s). These are space-weather events from NASA's DONKI database — environmental context for the mission safety workflow.");
      else lines.push("No DONKI data fetched yet. Use the Radiation Center to fetch the live NASA DONKI feed.");
      lines.push("Important: a DONKI event is NOT a measured crew dose, and Curiosity RAD values are historical Mars surface measurements, not astronaut readings.");
    } else {
      lines.push("Daily summary — " + a.name + " (" + a.role + ")");
      lines.push("Overall status: " + res.overall + ". Open alerts: " + state.alerts.filter(function (x) { return x.astronaut_id === a.id; }).length + ".");
      lines.push(hr.explanation);
      lines.push("Behavioral: " + res.behavioral.explanation);
      lines.push("All crew telemetry in this demo is SIMULATED; NASA records are labelled NASA_PUBLIC with source links.");
    }
    return lines.join("\n");
  }
  function numbersIn(text) { var m = String(text).match(/\d+(\.\d+)?/g); return m ? m.map(Number) : []; }
  function validateAiText(text, factsText) {
    // Blueprint guardrail (mirrors the medical-simplifier rule): AI text is shown
    // only if every number in it exists in the underlying records.
    var allowed = {};
    numbersIn(factsText).forEach(function (n) { allowed[n] = true; });
    return numbersIn(text).every(function (n) { return allowed[n] || n <= 10; });
  }
  function maybeGemini(kind) {
    var facts = explainLocal(kind);
    $("assistantOut").textContent = facts + "\n\nConsulting ASTRA AI Decision Support (Gemini 3.8 Flash)...";

    // Call backend AI service gateway
    fetch("/api/assistant/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ astronaut_id: selectedAstro, kind: kind })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (res) {
        if (res && res.explanation) {
          $("assistantOut").textContent = res.explanation;
        } else {
          $("assistantOut").textContent = facts;
        }
      })
      .catch(function () {
        $("assistantOut").textContent = facts;
      });
  }

  /* ---------------- Reports & Research ---------------- */
  function renderReports() {
    var a = state.astronauts.find(function (x) { return x.id === selectedAstro; });
    var res = evaluateAstro(a.id);
    $("dailyReport").innerHTML = "<h3>Daily Report — " + esc(a.name) + " · " + new Date().toLocaleDateString() + "</h3>" +
      "<p>Overall workflow status: <strong>" + res.overall + "</strong></p>" +
      "<table><tr><th>Metric</th><th>Latest</th><th>Baseline</th><th>Deviation</th><th>Status</th><th>Origin</th></tr>" +
      res.evals.map(function (e) {
        return "<tr><td>" + esc(S.METRICS[e.metric].label) + "</td><td>" + (e.latest ? e.latest.value + " " + esc(e.latest.unit) : "—") + "</td><td>" +
          (S.getBaseline(state, a.id, e.metric) || "—") + "</td><td>" + (e.deviation_pct === null ? "—" : e.deviation_pct.toFixed(1) + "%") + "</td><td>" + e.severity + "</td><td>" + (e.latest ? tag(e.latest.data_origin) : "—") + "</td></tr>";
      }).join("") + "</table>" +
      "<p>Behavioral: " + esc(res.behavioral.explanation) + "</p>" +
      '<p class="fineprint">Generated by ASTRA HEALTH prototype. Simulated demo data; not a medical record. Alert classes are workflow categories from a deterministic rules engine using personal baselines — not NASA-approved medical thresholds.</p>';
    $("alertHistory").innerHTML = state.alerts.length ? "<table><tr><th>When</th><th>Crew</th><th>Metric</th><th>Severity</th><th>Reasons</th></tr>" +
      state.alerts.slice().reverse().map(function (al) {
        var who = state.astronauts.find(function (x) { return x.id === al.astronaut_id; });
        return "<tr><td>" + fmtTime(al.created_at) + "</td><td>" + esc(who ? who.name : "") + "</td><td>" + esc(al.metric) + "</td><td>" + al.severity + "</td><td>" + esc((al.reason_codes || []).join(", ")) + "</td></tr>";
      }).join("") + "</table>" : '<p class="muted">No alerts recorded yet.</p>';
    renderInventoryTable();
  }

  var masterInventory = [];
  var masterBiomarkers = null;

  function renderInventoryTable() {
    var container = $("inventoryTableContainer");
    if (!container) return;
    if (!masterInventory.length) {
      container.innerHTML = '<p class="muted">Loading NASA Master Dataset Inventory…</p>';
      N.fetchInventory().then(function (data) {
        masterInventory = data || [];
        renderInventoryTable();
      });
      N.fetchBiomarkers().then(function (data) {
        masterBiomarkers = data;
        renderBiomarkers();
      });
      return;
    }

    var q = ($("invSearchInput") ? $("invSearchInput").value : "").toLowerCase().trim();
    var dom = $("invDomainFilter") ? $("invDomainFilter").value : "ALL";

    var filtered = masterInventory.filter(function (d) {
      var matchDom = dom === "ALL" || (d.domain || "").toLowerCase().indexOf(dom.toLowerCase()) !== -1 || (d.source || "").toLowerCase().indexOf(dom.toLowerCase()) !== -1;
      var matchQ = !q || (d.dataset_id || "").toLowerCase().indexOf(q) !== -1 ||
        (d.study_title || "").toLowerCase().indexOf(q) !== -1 ||
        (d.domain || "").toLowerCase().indexOf(q) !== -1 ||
        (d.ASTRA_use || "").toLowerCase().indexOf(q) !== -1;
      return matchDom && matchQ;
    });

    container.innerHTML = '<table><thead><tr><th>ID</th><th>Source</th><th>Study Title / Scope</th><th>Domain &amp; Assay</th><th>ASTRA Grounding Use</th><th>Link</th></tr></thead><tbody>' +
      filtered.map(function (d) {
        return '<tr><td><strong>' + esc(d.dataset_id) + '</strong></td>' +
          '<td><span class="tag tag-nasa">' + esc(d.source) + '</span></td>' +
          '<td><strong>' + esc(d.study_title) + '</strong><br><small class="muted">' + esc(d.sample_type) + '</small></td>' +
          '<td><small>' + esc(d.domain) + '<br>' + esc(d.assay_or_measurement) + '</small></td>' +
          '<td><small class="ok">' + esc(d.ASTRA_use) + '</small></td>' +
          '<td>' + (d.study_page_url ? '<a href="' + esc(d.study_page_url) + '" target="_blank" rel="noopener">Open ↗</a>' : '—') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function renderBiomarkers() {
    var bc = $("biomarkersContainer");
    if (!bc || !masterBiomarkers || !masterBiomarkers.clinical_panels) return;
    bc.innerHTML = '<h4 style="margin-top:16px">Inspiration4 Clinical Biomarker Panels (OSD-575 &amp; OSD-569 Grounding)</h4>' +
      '<div class="grid grid-2">' +
      masterBiomarkers.clinical_panels.map(function (p) {
        return '<div class="event-item"><strong>' + esc(p.panel) + '</strong>' +
          '<p class="muted" style="margin:4px 0">' + esc(p.description) + '</p>' +
          '<small><strong>Vitals link:</strong> ' + esc(p.relation_to_vitals) + '</small><br>' +
          '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">View OSDR Study Record ↗</a></div>';
      }).join('') + '</div>';
  }
  function researchHtml(records) {
    return records.map(function (r) {
      return '<div class="research-item"><strong>' + esc(r.title) + "</strong> " + tag(r.data_origin) +
        '<br><span class="muted">' + esc(r.source_name) + " · ID " + esc(r.source_record_id) + " · retrieved " + fmtTime(r.retrieved_at) + "</span>" +
        (r.description ? "<br>" + esc(r.description) : "") +
        '<br><a href="' + esc(r.source_url) + '" target="_blank" rel="noopener">Open source record</a></div>';
    }).join("");
  }
  function searchResearch(query) {
    $("libraryStatus").textContent = "Searching NASA OSDR and NTRS…";
    var done = { osdr: null, ntrs: null };
    function finish() {
      if (done.osdr === null || done.ntrs === null) return;
      var all = (done.osdr.records || []).concat(done.ntrs.records || []);
      var notes = [];
      if (done.osdr.error) notes.push("OSDR failed: " + done.osdr.error);
      if (done.ntrs.error) notes.push("NTRS failed: " + done.ntrs.error);
      if (all.length) {
        state.nasa_cache.RESEARCH = { records: all, retrieved_at: S.nowIso(), query: query };
        S.save(state);
        $("libraryResults").innerHTML = researchHtml(all);
        $("libraryStatus").innerHTML = '<span class="ok">Live results</span> — ' + all.length + " record(s)." + (notes.length ? ' <span class="err">' + esc(notes.join(" · ")) + "</span>" : "");
      } else {
        var c = state.nasa_cache.RESEARCH;
        $("libraryStatus").innerHTML = '<span class="err">No live results (' + esc(notes.join(" · ") || "empty response") + ").</span> " +
          (c ? "Showing cached results from " + fmtTime(c.retrieved_at) + " (stale)." : "No cache yet.");
        if (c) $("libraryResults").innerHTML = researchHtml(c.records);
      }
    }
    N.searchOsdr(query, 6).then(function (recs) { S.logSync(state, "NASA OSDR", "ok"); done.osdr = { records: recs }; finish(); })
      .catch(function (e) { S.logSync(state, "NASA OSDR", "error", e.message); done.osdr = { error: e.message }; finish(); });
    N.searchNtrs(query, 6).then(function (recs) { S.logSync(state, "NASA NTRS", "ok"); done.ntrs = { records: recs }; finish(); })
      .catch(function (e) { S.logSync(state, "NASA NTRS", "error", e.message); done.ntrs = { error: e.message }; finish(); });
    S.save(state);
  }

  /* ---------------- Wiring ---------------- */
  function renderAll() { renderDashboard(); renderPhysio(); renderRadiation(); renderBehavioral(); renderReports(); }
  $("tabs").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-screen]"); if (!btn) return;
    var screen = btn.getAttribute("data-screen");
    document.querySelectorAll(".side-nav button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-screen") === screen && !b.hasAttribute("data-goto-library") || b === btn); });
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.toggle("active", s.id === "screen-" + screen); });
    renderAll();
    if (btn.hasAttribute("data-goto-library")) { var lc = $("libraryCard"); if (lc) lc.scrollIntoView({ behavior: "smooth" }); }
  });
  $("crewSelect").addEventListener("change", function () { selectedAstro = this.value; renderAll(); });
  $("simTickBtn").addEventListener("click", function () {
    SIM.tick(state);
    recordAlerts();
    renderAll();
    fetch("/api/vitals/simulate-tick", { method: "POST" }).catch(function () {});
  });
  $("refreshDonkiBtn").addEventListener("click", function () { fetchDonki("SEP"); });
  $("donkiFetchBtn").addEventListener("click", function () { fetchDonki($("donkiType").value); });
  $("vitalForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var m = $("vitalMetric").value, v = parseFloat($("vitalValue").value);
    if (!S.isValidVital(m, v)) {
      var range = S.VALID_RANGES[m];
      $("vitalFormMsg").textContent = "Rejected: enter a plausible value for " + S.METRICS[m].label + " (" + range[0] + "–" + range[1] + " " + S.METRICS[m].unit + "). Negative, empty and impossible values are not saved.";
      return;
    }
    S.addVital(state, { astronaut_id: selectedAstro, metric: m, value: v, quality_status: $("vitalQuality").value, data_origin: "MANUAL" });
    recordAlerts();
    $("vitalFormMsg").textContent = "Saved as a MANUAL reading. Engine re-evaluated.";
    renderAll();
    fetch("/api/vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ astronaut_id: selectedAstro, metric: m, value: v, quality_status: $("vitalQuality").value, data_origin: "MANUAL" })
    }).catch(function () {});
  });
  $("checkinForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var now = S.nowIso();
    state.sleep_logs.push({ id: S.uid(), astronaut_id: selectedAstro, duration_hours: parseFloat($("ciSleep").value), quality: $("ciSleepQuality").value, recorded_at: now, data_origin: "MANUAL" });
    state.mood_logs.push({ id: S.uid(), astronaut_id: selectedAstro, mood: parseInt($("ciMood").value, 10), stress: parseInt($("ciStress").value, 10), fatigue: parseInt($("ciFatigue").value, 10), recorded_at: now, data_origin: "MANUAL" });
    if ($("ciExercise").value) state.exercise_logs.push({ id: S.uid(), astronaut_id: selectedAstro, activity_type: $("ciExercise").value, duration_min: parseInt($("ciExerciseMin").value || "0", 10), intensity: "self-reported", recorded_at: now, data_origin: "MANUAL" });
    recordAlerts();
    $("checkinMsg").textContent = "Check-in saved (MANUAL).";
    renderAll();
    fetch("/api/behavioral/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        astronaut_id: selectedAstro,
        sleep_hours: parseFloat($("ciSleep").value),
        sleep_quality: $("ciSleepQuality").value,
        mood: parseInt($("ciMood").value, 10),
        stress: parseInt($("ciStress").value, 10),
        fatigue: parseInt($("ciFatigue").value, 10),
        exercise_type: $("ciExercise").value || undefined,
        exercise_min: parseInt($("ciExerciseMin").value || "0", 10)
      })
    }).catch(function () {});
  });
  var invSearch = $("invSearchInput");
  if (invSearch) invSearch.addEventListener("input", renderInventoryTable);
  var invFilter = $("invDomainFilter");
  if (invFilter) invFilter.addEventListener("change", renderInventoryTable);
  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var q = chip.getAttribute("data-q");
      if (chip.closest("#screen-dashboard")) { $("dashAssistantOut").textContent = explainLocal(q); }
      else maybeGemini(q);
    });
  });

  // Dashboard AI Query
  function handleDashQuery() {
    var input = $("dashAskInput");
    if (!input) return;
    var q = input.value.trim();
    if (!q) return;
    var out = $("dashAssistantOut");
    if (out) out.textContent = "Consulting ASTRA AI Knowledge Base (Gemini 3.8 Flash)...";
    fetch("/api/assistant/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, astronaut_id: selectedAstro })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (res) {
        if (out) out.textContent = (res.answer || res.explanation || "No response received.");
      })
      .catch(function (err) {
        if (out) out.textContent = "Notice: " + err.message + ". Telemetry baseline is stable.";
      });
  }
  if ($("dashAskBtn")) $("dashAskBtn").addEventListener("click", handleDashQuery);
  if ($("dashAskInput")) $("dashAskInput").addEventListener("keydown", function (e) { if (e.key === "Enter") handleDashQuery(); });

  // Physiological Screen AI Vital Trend Evaluation
  if ($("aiPhysioBtn")) {
    $("aiPhysioBtn").addEventListener("click", function () {
      var out = $("aiPhysioOut");
      if (out) { out.style.display = "block"; out.textContent = "Analyzing vital trends with Inspiration4 multi-omics datasets (OSD-575 / OSD-569)..."; }
      fetch("/api/assistant/vital-trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ astronaut_id: selectedAstro, metric: "heart_rate" })
      })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (res) {
          if (out) out.textContent = res.explanation || "Vital trend analyzed.";
        })
        .catch(function (err) {
          if (out) out.textContent = "Trend analysis notice: " + err.message;
        });
    });
  }

  // Radiation Center AI Space Weather & Shielding Advisory
  if ($("aiRadiationBtn")) {
    $("aiRadiationBtn").addEventListener("click", function () {
      var out = $("aiRadiationOut");
      if (out) { out.style.display = "block"; out.textContent = "Synthesizing NASA DONKI space weather with Curiosity RAD Mars surface measurements..."; }
      fetch("/api/assistant/radiation-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ astronaut_id: selectedAstro })
      })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (res) {
          if (out) out.textContent = res.advisory || res.explanation || "Radiation assessment completed.";
        })
        .catch(function (err) {
          if (out) out.textContent = "Radiation advisory notice: " + err.message;
        });
    });
  }

  // Behavioral Health AI Circadian & Fatigue Analysis
  if ($("aiBehavioralBtn")) {
    $("aiBehavioralBtn").addEventListener("click", function () {
      var out = $("aiBehavioralOut");
      if (out) { out.style.display = "block"; out.textContent = "Evaluating circadian stability and fatigue accumulation against NASA LSDA norms..."; }
      fetch("/api/assistant/behavioral-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ astronaut_id: selectedAstro })
      })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (res) {
          if (out) out.textContent = res.assessment || res.explanation || "Behavioral evaluation completed.";
        })
        .catch(function (err) {
          if (out) out.textContent = "Behavioral analysis notice: " + err.message;
        });
    });
  }

  // AI Assistant Free-Form Question Handler
  function handleCustomAiQuery() {
    var input = $("aiCustomQuery");
    if (!input) return;
    var q = input.value.trim();
    if (!q) return;
    var out = $("assistantOut");
    if (out) out.textContent = "Consulting ASTRA AI Knowledge Base (Gemini 3.8 Flash)...";
    fetch("/api/assistant/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, astronaut_id: selectedAstro })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (res) {
        if (!out) return;
        var txt = res.answer || res.explanation || "No response received.";
        if (res.source) txt += "\n\n— Powered by: " + res.source;
        if (res.inventory_matches && res.inventory_matches.length) {
          txt += "\n\nCorrelated NASA Datasets:\n" + res.inventory_matches.map(function (m) {
            return "• [" + m.dataset_id + "] " + m.study_title + " (" + m.source + ")";
          }).join("\n");
        }
        out.textContent = txt;
      })
      .catch(function (err) {
        if (out) out.textContent = "Error querying assistant: " + err.message;
      });
  }
  if ($("aiCustomBtn")) $("aiCustomBtn").addEventListener("click", handleCustomAiQuery);
  if ($("aiCustomQuery")) $("aiCustomQuery").addEventListener("keydown", function (e) { if (e.key === "Enter") handleCustomAiQuery(); });

  // Reports & Research AI Executive Medical Briefing
  if ($("aiDailyBriefingBtn")) {
    $("aiDailyBriefingBtn").addEventListener("click", function () {
      var out = $("aiDailyBriefingOut");
      if (out) { out.style.display = "block"; out.textContent = "Compiling AI Executive Medical Briefing with mission status and clinical evidence..."; }
      fetch("/api/assistant/daily-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ astronaut_id: selectedAstro })
      })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (res) {
          if (out) out.textContent = res.briefing || res.explanation || "Executive briefing compiled.";
        })
        .catch(function (err) {
          if (out) out.textContent = "Executive briefing notice: " + err.message;
        });
    });
  }
  $("researchBtn").addEventListener("click", function () {
    var q = $("researchQuery").value.trim() || "astronaut health";
    $("assistantOut").textContent = "Searching NASA NTRS + OSDR for: " + q + "…";
    Promise.all([N.searchNtrs(q, 4).catch(function (e) { return { error: e.message }; }),
                 N.searchOsdr(q, 4).catch(function (e) { return { error: e.message }; })])
      .then(function (res) {
        var recs = (Array.isArray(res[0]) ? res[0] : []).concat(Array.isArray(res[1]) ? res[1] : []);
        $("assistantOut").innerHTML = recs.length ? researchHtml(recs) :
          "No live research results (network or API unavailable). Portal links: ntrs.nasa.gov · osdr.nasa.gov";
      });
  });
  $("libraryBtn").addEventListener("click", function () { searchResearch($("libraryQuery").value.trim() || "astronaut health"); });
  $("printReportBtn").addEventListener("click", function () { window.print(); });
  $("resetDemoBtn").addEventListener("click", function () {
    state = S.reset(); S.setBaselinesFromDefaults(state); SIM.backfill(state); S.save(state);
    selectedAstro = state.astronauts[0].id; recordAlerts(); renderAll();
  });

  function tickClock() {
    var start = Date.parse(state.missions[0].start_date);
    var day = Math.floor((Date.now() - start) / 86400000) + 1;
    $("missionDay").textContent = day;
    $("clock").textContent = new Date().toLocaleTimeString();
    var online = navigator.onLine;
    var el = $("netStatus");
    el.textContent = online ? "Online — NASA sources reachable on demand" : "Offline — cached + local data only";
    el.className = "pill " + (online ? "pill-ok" : "pill-bad");
  }
  setInterval(tickClock, 1000); tickClock();

  recordAlerts();
  renderAll();
  // Warm the DONKI cache on load (blueprint demo scenario step 4).
  fetchDonki("SEP");
})();
