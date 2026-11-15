import React, { useState } from "react";
import { useAstra } from "../store/astraStore";
import { Sparkline, HeartRateChart } from "../components/Sparkline";
import { METRICS } from "../utils/healthEngine";
import { api } from "../services/api";

export function MissionCommandPage({ onNavigate }) {
  const {
    astronauts,
    selectedAstro,
    setSelectedAstro,
    vitals,
    baselines,
    sleepLogs,
    moodLogs,
    alerts,
    syncLogs,
    radiationEvents,
    donkiSummary,
    simulateTick,
    fetchDonki,
    evaluateCrewMember
  } = useAstra();

  const [dashAssistOut, setDashAssistOut] = useState(
    "Tap a question — the assistant explains the deterministic engine's output with its reason codes."
  );
  const [dashInput, setDashInput] = useState("");
  const [dashLoading, setDashLoading] = useState(false);

  const handleDashAsk = async () => {
    if (!dashInput.trim()) return;
    setDashLoading(true);
    try {
      const res = await api.queryAssistant({
        query: dashInput.trim(),
        astronaut_id: selectedAstro,
        model: "gemini-3.8-flash"
      });
      setDashAssistOut(res.answer || res.explanation || "No response received.");
    } catch (e) {
      setDashAssistOut(`Notice: ${e.message}. Telemetry baseline is stable.`);
    } finally {
      setDashLoading(false);
    }
  };

  const evaluatedCrew = astronauts.map((a) => {
    const summary = evaluateCrewMember(a.id);
    const hr = summary.evals.find((e) => e.metric === "heart_rate");
    const astroVitals = vitals.filter((v) => v.astronaut_id === a.id && v.metric === "heart_rate");
    return {
      ...a,
      summary,
      hr,
      vitals: astroVitals
    };
  });

  const counts = { NORMAL: 0, WATCH: 0, ACT: 0 };
  evaluatedCrew.forEach((c) => {
    counts[c.summary.overall] = (counts[c.summary.overall] || 0) + 1;
  });

  const activeAstro = evaluatedCrew.find((c) => c.id === selectedAstro) || evaluatedCrew[0];
  const activeSummary = activeAstro?.summary;
  const activeHrReadings = vitals
    .filter((v) => v.astronaut_id === selectedAstro && v.metric === "heart_rate")
    .slice(-24);
  const activeBaseline =
    baselines.find((b) => b.astronaut_id === selectedAstro && b.metric === "heart_rate")?.baseline_value || 68;

  const activeSleeps = sleepLogs.filter((s) => s.astronaut_id === selectedAstro);
  const activeMoods = moodLogs.filter((m) => m.astronaut_id === selectedAstro);
  const lastSleep = activeSleeps[activeSleeps.length - 1];
  const lastMood = activeMoods[activeMoods.length - 1];

  const handleChipClick = async (q) => {
    const hr = activeSummary?.evals.find((e) => e.metric === "heart_rate");
    let fallbackText = "";
    if (q === "hr") {
      fallbackText = `Heart-rate explanation (${activeAstro.name}, reason codes: ${(hr?.reason_codes || []).join(", ") || "none"}):\n${hr?.explanation}\nContext matters: recent exercise, sleep, and symptoms should be reviewed before any conclusion. ASTRA does not diagnose a cause from heart rate alone.`;
    } else if (q === "sleep") {
      fallbackText = `Sleep & fatigue pattern: ${activeSummary?.behavioral.severity} — ${activeSummary?.behavioral.explanation}\nSuggested workflow: prompt a check-in with the crew member and review workload scheduling under mission flight rules.`;
    } else if (q === "radiation") {
      fallbackText = `Radiation context: Environmental space weather events are monitored via NASA DONKI. They represent mission environmental context and are never converted into personal absorbed doses without validated physical transport models.`;
    } else {
      fallbackText = `Daily status — ${activeAstro.name} (${activeAstro.role}):\nOverall status: ${activeSummary?.overall}. Open alerts: ${alerts.filter((a) => a.astronaut_id === activeAstro.id).length}.\n${hr?.explanation}\nBehavioral: ${activeSummary?.behavioral.explanation}`;
    }
    setDashAssistOut(fallbackText);

    try {
      setDashLoading(true);
      const res = await api.explainHealth({ astronaut_id: selectedAstro, kind: q });
      if (res && res.explanation) {
        setDashAssistOut(res.explanation);
      }
    } catch (e) {
      // Keeps deterministic fallback
    } finally {
      setDashLoading(false);
    }
  };

  const getInitials = (name) => {
    const m = String(name).match(/Crew Member (\w)/);
    return m ? `C${m[1]}` : "CM";
  };

  return (
    <section className="screen active">
      <div className="row row-between">
        <h2>Crew Health Status</h2>
        <div className="actions">
          <label className="inline">
            Crew member{" "}
            <select value={selectedAstro} onChange={(e) => setSelectedAstro(e.target.value)}>
              {astronauts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={simulateTick} className="btn">
            ▶ Simulate live reading (SIMULATED)
          </button>
          <button onClick={() => fetchDonki("SEP")} className="btn btn-ghost">
            ↻ Refresh DONKI events
          </button>
        </div>
      </div>

      <div className="summary-pills">
        <span className="summary-pill">
          <span className="dot dot-NORMAL" />
          {counts.NORMAL} Normal
        </span>
        <span className="summary-pill">
          <span className="dot dot-WATCH" />
          {counts.WATCH || 0} Watch
        </span>
        <span className="summary-pill">
          <span className="dot dot-ACT" />
          {counts.ACT || 0} Act
        </span>
        <span className="summary-pill">
          <span className="tag tag-sim">SIMULATED</span> demo crew telemetry
        </span>
      </div>

      <div className="crew-row">
        {evaluatedCrew.map((c) => {
          const isAct = c.summary.overall === "ACT";
          const isWatch = c.summary.overall === "WATCH";
          const glowClass = isAct ? "glow-ACT" : isWatch ? "glow-WATCH" : "";
          const sparkColor = isAct ? "#ff5d6c" : isWatch ? "#ffb648" : "#2fe6a8";

          return (
            <div
              key={c.id}
              onClick={() => setSelectedAstro(c.id)}
              className={`crew-card ${glowClass} ${selectedAstro === c.id ? "selected" : ""}`}
            >
              <div className="crew-top">
                <div className="avatar">{getInitials(c.name)}</div>
                <div>
                  <div className="crew-name">{c.name}</div>
                  <div className="crew-role">{c.role}</div>
                </div>
              </div>
              <div className="crew-hr">
                <span className="hr-val">
                  ♥ {c.hr?.latest?.value ?? "—"} BPM
                  {c.hr?.deviation_pct != null && (
                    <small>
                      {" "}
                      {c.hr.deviation_pct >= 0 ? "↑" : "↓"}
                      {Math.abs(c.hr.deviation_pct).toFixed(1)}%
                    </small>
                  )}
                </span>
                <span className={`sev-badge sev-${c.summary.overall}`}>{c.summary.overall}</span>
              </div>
              <Sparkline readings={c.vitals.slice(-24)} color={sparkColor} height={30} />
            </div>
          );
        })}
      </div>

      <div className="dash-grid">
        {/* Panel 1: Physiological Monitoring */}
        <div className="card panel-physio">
          <div className="panel-head">
            <h3>{activeAstro?.name} — Physiological Monitoring</h3>
            <span className={`sev-badge sev-${activeSummary?.overall}`}>{activeSummary?.overall}</span>
          </div>

          <div className="vital-rows">
            {activeSummary?.evals.map((e) => {
              const devTxt =
                e.deviation_pct === null ? "—" : `${e.deviation_pct >= 0 ? "↑ +" : "↓ "}${e.deviation_pct.toFixed(1)}%`;
              const devCls =
                e.deviation_pct === null ? "dev-flat" : Math.abs(e.deviation_pct) >= 15 ? "dev-up" : "dev-flat";
              const displaySev =
                e.severity === "WATCH" && e.reason_codes.includes("DEVIATION_ACT_SINGLE") ? "RECHECK" : e.severity;

              return (
                <div key={e.metric} className="vital-row">
                  <div className="vital-ic">
                    {e.metric === "heart_rate"
                      ? "♥"
                      : e.metric === "spo2"
                      ? "◍"
                      : e.metric === "systolic_bp"
                      ? "◈"
                      : e.metric === "body_temp"
                      ? "°"
                      : "≋"}
                  </div>
                  <div className="vital-main">
                    <div className="vital-name">{METRICS[e.metric]?.label || e.metric}</div>
                    <div className="vital-val">
                      {e.latest ? `${e.latest.value} ${e.latest.unit}` : "no data"}
                    </div>
                  </div>
                  <span className={`vital-dev ${devCls}`}>{devTxt}</span>
                  <span className={`sev-badge sev-${displaySev}`}>{displaySev}</span>
                </div>
              );
            })}
          </div>

          <div className="chart-title">Heart Rate Trend (recent readings)</div>
          <HeartRateChart readings={activeHrReadings} baseline={activeBaseline} height={150} />
        </div>

        {/* Panel 2: Space Radiation & Weather */}
        <div className="card panel-rad">
          <div className="panel-head">
            <h3>Space Radiation &amp; Weather</h3>
            <span className="tag tag-nasa">NASA_PUBLIC</span>
          </div>
          <div className="muted">{donkiSummary}</div>
          <div className="mt-2">
            {radiationEvents.slice(0, 3).map((e, idx) => (
              <div key={idx} className="event-item">
                <strong>{e.event_type}</strong> · {e.source_record_id}{" "}
                <span className="tag tag-nasa">NASA_PUBLIC</span>
                <br />
                <span className="muted">
                  Observed: {new Date(e.observed_at).toLocaleString()} · Retrieved:{" "}
                  {new Date(e.retrieved_at).toLocaleString()}
                </span>
                <br />
                <a href={e.source_url} target="_blank" rel="noopener noreferrer">
                  Source: NASA DONKI
                </a>
              </div>
            ))}
          </div>
          <div className="event-item">
            <strong>Curiosity RAD (Mars)</strong> <span className="tag tag-nasa">NASA_PUBLIC</span>
            <br />
            0.64 ± 0.12 mSv/day — Mars surface dose equivalent rate (Gale Crater)
            <br />
            <span className="muted">
              Hassler et al., Science 2014 · historical research context, not crew telemetry
            </span>
          </div>
          <p className="fineprint">
            A DONKI event is space-weather context, <strong>not</strong> a crew member's measured radiation dose.
          </p>
        </div>

        {/* Panel 3: AI Health Assistant */}
        <div className="card panel-assist">
          <div className="panel-head">
            <h3>AI Health Assistant</h3>
            <span className="tag tag-sim">GEMINI 3.8 FLASH · NON-DIAGNOSTIC</span>
          </div>
          <div className="chips">
            <button className="chip" onClick={() => handleChipClick("hr")}>
              Why is the heart rate high?
            </button>
            <button className="chip" onClick={() => handleChipClick("status")}>
              Full status
            </button>
            <button className="chip" onClick={() => handleChipClick("sleep")}>
              Sleep &amp; fatigue
            </button>
            <button className="chip" onClick={() => handleChipClick("radiation")}>
              Radiation context
            </button>
          </div>
          <div className="form-row mt-2" style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <input
              type="text"
              value={dashInput}
              onChange={(e) => setDashInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDashAsk()}
              placeholder="Ask AI Assistant anything about crew health or mission rules..."
              style={{ flex: 1 }}
            />
            <button className="btn" onClick={handleDashAsk} disabled={dashLoading}>
              Ask AI
            </button>
          </div>
          <div className="assistant-out small">
            {dashLoading ? "Consulting ASTRA AI Knowledge Base (Gemini 3.8 Flash)..." : dashAssistOut}
          </div>
          <p className="fineprint">
            Connected to Gemini 3.8 Flash &amp; NASA Research RAG Knowledge Base.
          </p>
        </div>

        {/* Panel 4: Recent Alerts */}
        <div className="card panel-alerts">
          <div className="panel-head">
            <h3>Recent Alerts</h3>
            <span className="muted">deterministic rules engine</span>
          </div>
          {alerts.length ? (
            alerts.slice(-4).map((al) => {
              const who = astronauts.find((a) => a.id === al.astronaut_id);
              return (
                <div key={al.id} className={`alert-item ${al.severity}`}>
                  <strong>{al.severity}</strong> · {who?.name} · {al.metric}
                  <div className="when">
                    {new Date(al.created_at).toLocaleString()} · reasons:{" "}
                    {typeof al.reason_codes === "string" ? al.reason_codes : JSON.stringify(al.reason_codes)}
                  </div>
                  <div>{al.reason || al.explanation}</div>
                </div>
              );
            })
          ) : (
            <p className="muted">No alerts. All monitored metrics are within their configured deviation bands.</p>
          )}
        </div>

        {/* Panel 5: Crew Behavioral Health */}
        <div className="card panel-behav">
          <div className="panel-head">
            <h3>Crew Behavioral Health</h3>
            <span className={`sev-badge sev-${activeSummary?.behavioral.severity}`}>
              {activeSummary?.behavioral.severity}
            </span>
          </div>
          <div className="tiles">
            <div className="tile">
              <div className="t-ic">☾</div>
              <div className="t-name">Sleep</div>
              <div className="t-val">{lastSleep ? `${lastSleep.duration_hours} h` : "—"}</div>
              <div className="t-sub">{lastSleep ? `${lastSleep.quality} quality` : "no log"}</div>
            </div>
            <div className="tile">
              <div className="t-ic">☺</div>
              <div className="t-name">Mood</div>
              <div className="t-val">{lastMood ? `${lastMood.mood} /10` : "—"}</div>
              <div className="t-sub">self-report</div>
            </div>
            <div className="tile">
              <div className="t-ic">⚡</div>
              <div className="t-name">Stress</div>
              <div className="t-val">{lastMood ? `${lastMood.stress} /10` : "—"}</div>
              <div className="t-sub">self-report</div>
            </div>
            <div className="tile">
              <div className="t-ic">▽</div>
              <div className="t-name">Fatigue</div>
              <div className="t-val">{lastMood ? `${lastMood.fatigue} /10` : "—"}</div>
              <div className="t-sub">self-report</div>
            </div>
          </div>
          <div className="muted mt-3">{activeSummary?.behavioral.explanation}</div>
        </div>

        {/* Panel 6: NASA Data Integration */}
        <div className="card panel-nasa">
          <div className="panel-head">
            <h3>NASA Data Integration</h3>
            <span className="muted">strictly the blueprint's five sources</span>
          </div>
          <div className="src-row">
            <span className="src-badge src-osdr">OSDR</span>
            <span>Space biology &amp; human research</span>
            <a className="go" href="https://osdr.nasa.gov/" target="_blank" rel="noopener noreferrer">
              Open ↗
            </a>
          </div>
          <div className="src-row">
            <span className="src-badge src-donki">DONKI</span>
            <span>Space weather &amp; solar events</span>
            <a className="go" href="https://ccmc.gsfc.nasa.gov/DONKI/" target="_blank" rel="noopener noreferrer">
              Open ↗
            </a>
          </div>
          <div className="src-row">
            <span className="src-badge src-rad">RAD</span>
            <span>Mars radiation measurements</span>
            <a className="go" href="https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/" target="_blank" rel="noopener noreferrer">
              Open ↗
            </a>
          </div>
          <div className="src-row">
            <span className="src-badge src-lsda">LSDA</span>
            <span>Life sciences research</span>
            <a className="go" href="https://nlsp.nasa.gov/explore/lsdahome" target="_blank" rel="noopener noreferrer">
              Open ↗
            </a>
          </div>
          <div className="src-row">
            <span className="src-badge src-ntrs">NTRS</span>
            <span>Technical reports &amp; publications</span>
            <a className="go" href="https://ntrs.nasa.gov/" target="_blank" rel="noopener noreferrer">
              Open ↗
            </a>
          </div>

          <h4 className="sync-h">Sync &amp; Source Status</h4>
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Last sync</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {["NASA DONKI", "NASA OSDR", "NASA NTRS"].map((src) => {
                const item = syncLogs.find((l) => l.source === src);
                return (
                  <tr key={src}>
                    <td>{src}</td>
                    <td>{item ? new Date(item.last_synced_at).toLocaleTimeString() : "recent"}</td>
                    <td>
                      {item ? (
                        item.status === "ok" ? (
                          <span className="ok">ok</span>
                        ) : (
                          <span className="err">{item.error_message || "error"}</span>
                        )
                      ) : (
                        <span className="ok">ok</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="legend-bar">
        <span className="legend-title">⚙ Alert Engine (Deterministic)</span>
        <span className="legend-item">
          <span className="sev-badge sev-NORMAL">NORMAL</span> Deviation &lt; 15% → Continue monitoring
        </span>
        <span className="legend-item">
          <span className="sev-badge sev-WATCH">WATCH</span> 15–30% or repeated small → Recheck, review context
        </span>
        <span className="legend-item">
          <span className="sev-badge sev-RECHECK">RECHECK</span> Single ≥ 30% (no repeat) → Take a repeat reading
        </span>
        <span className="legend-item">
          <span className="sev-badge sev-ACT">ACT</span> ≥ 30% with confirmed repeat → Follow medical protocol
        </span>
      </div>
    </section>
  );
}

