import React, { useState } from "react";
import { useAstra } from "../store/astraStore";
import { HeartRateChart } from "../components/Sparkline";
import { METRICS } from "../utils/healthEngine";
import { api } from "../services/api";

export function PhysiologicalPage() {
  const { selectedAstro, vitals, baselines, addVital, evaluateCrewMember } = useAstra();
  const [metric, setMetric] = useState("heart_rate");
  const [value, setValue] = useState("");
  const [quality, setQuality] = useState("validated");
  const [formMsg, setFormMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiOut, setAiOut] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const summary = evaluateCrewMember(selectedAstro);

  const handleAiAnalyze = async () => {
    setAiLoading(true);
    try {
      const res = await api.getVitalTrendAi({
        astronaut_id: selectedAstro,
        metric: "heart_rate",
        model: "gemini-3.8-flash"
      });
      setAiOut(res.explanation || "Vital trend analyzed.");
    } catch (err) {
      setAiOut(`Trend analysis notice: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const meta = METRICS[metric];
    const num = parseFloat(value);
    if (isNaN(num) || num < meta.min || num > meta.max) {
      setFormMsg(`Rejected: enter a plausible value for ${meta.label} (${meta.min}–${meta.max} ${meta.unit}). Negative, empty and impossible values are not saved.`);
      return;
    }

    setSaving(true);
    try {
      await addVital({
        astronaut_id: selectedAstro,
        metric,
        value: num,
        quality_status: quality,
        data_origin: "MANUAL"
      });
      setFormMsg("Saved as a MANUAL reading. Engine re-evaluated.");
      setValue("");
    } catch (err) {
      setFormMsg(`Error saving reading: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="screen active">
      <h2>Physiological Monitoring</h2>
      <p className="muted">
        Heart rate, SpO₂, blood pressure, temperature and respiratory rate, each compared with the selected crew member's{" "}
        <strong>personal baseline</strong>. Deviation bands (WATCH ≥15%, ACT ≥30% repeated) are prototype workflow configuration — not clinical thresholds.
      </p>

      <div className="grid grid-2">
        {summary.evals.map((e) => {
          const mReadings = vitals.filter((v) => v.astronaut_id === selectedAstro && v.metric === e.metric).slice(-24);
          const b = baselines.find((x) => x.astronaut_id === selectedAstro && x.metric === e.metric)?.baseline_value || METRICS[e.metric]?.baseline;

          return (
            <div key={e.metric} className="card">
              <div className="panel-head">
                <h3>
                  {METRICS[e.metric]?.label} — <span className={`sev sev-${e.severity}`}>{e.severity}</span>
                </h3>
              </div>
              <div className="muted mb-2">
                Latest: {e.latest ? `${e.latest.value} ${e.latest.unit} · ${new Date(e.latest.recorded_at).toLocaleTimeString()}` : "no data"}
                {" "}<span className={`tag tag-${e.latest?.data_origin === "SIMULATED" ? "sim" : "manual"}`}>{e.latest?.data_origin || "NO_DATA"}</span> · Baseline: {b} {METRICS[e.metric]?.unit}
              </div>
              <HeartRateChart readings={mReadings} baseline={b} height={120} />
              <p className="mt-2 text-sm">{e.explanation}</p>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>
          Add a reading <span className="tag tag-manual">MANUAL</span>
        </h3>
        <form onSubmit={handleSubmit} className="form-row">
          <label>
            Metric
            <select value={metric} onChange={(e) => setMetric(e.target.value)}>
              {Object.keys(METRICS).map((m) => (
                <option key={m} value={m}>
                  {METRICS[m].label} ({METRICS[m].unit})
                </option>
              ))}
            </select>
          </label>

          <label>
            Value
            <input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 72"
              required
            />
          </label>

          <label>
            Quality
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="validated">validated</option>
              <option value="needs review">needs review</option>
              <option value="estimated">estimated</option>
            </select>
          </label>

          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save reading"}
          </button>
        </form>
        {formMsg && <div className="muted mt-2">{formMsg}</div>}
      </div>

      <div className="card" style={{ marginTop: "16px" }}>
        <div className="row row-between" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>AI Physiological Trend Evaluation</h3>
          <span className="tag tag-sim">GEMINI 3.8 FLASH</span>
        </div>
        <p className="muted">
          Synthesizes the selected crew member's readings against personal baseline and Inspiration4 OSD-575 / OSD-569 panels.
        </p>
        <button onClick={handleAiAnalyze} className="btn" disabled={aiLoading}>
          {aiLoading ? "Analyzing Vital Trends…" : "✦ AI Analyze Vital Trends"}
        </button>
        {(aiLoading || aiOut) && (
          <div className="assistant-out small" style={{ marginTop: "10px" }}>
            {aiLoading ? "Analyzing vital trends with Inspiration4 multi-omics datasets (OSD-575 / OSD-569)..." : aiOut}
          </div>
        )}
      </div>
    </section>
  );
}

