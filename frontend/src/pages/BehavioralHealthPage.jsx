import React, { useState } from "react";
import { useAstra } from "../store/astraStore";
import { api } from "../services/api";

export function BehavioralHealthPage() {
  const { selectedAstro, sleepLogs, moodLogs, exerciseLogs, addCheckin, evaluateCrewMember } = useAstra();

  const [sleep, setSleep] = useState("7.0");
  const [sleepQuality, setSleepQuality] = useState("good");
  const [mood, setMood] = useState("8");
  const [stress, setStress] = useState("3");
  const [fatigue, setFatigue] = useState("3");
  const [exercise, setExercise] = useState("");
  const [exerciseMin, setExerciseMin] = useState("30");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiOut, setAiOut] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const summary = evaluateCrewMember(selectedAstro);
  const astroSleeps = sleepLogs.filter((s) => s.astronaut_id === selectedAstro).slice(-5).reverse();
  const astroMoods = moodLogs.filter((m) => m.astronaut_id === selectedAstro).slice(-5).reverse();

  const handleAiBehavioral = async () => {
    setAiLoading(true);
    try {
      const res = await api.getBehavioralAi({
        astronaut_id: selectedAstro,
        model: "gemini-3.8-flash"
      });
      setAiOut(res.assessment || res.explanation || "Behavioral evaluation completed.");
    } catch (err) {
      setAiOut(`Behavioral analysis notice: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addCheckin({
        sleep: {
          astronaut_id: selectedAstro,
          duration_hours: parseFloat(sleep),
          quality: sleepQuality,
          data_origin: "MANUAL"
        },
        mood: {
          astronaut_id: selectedAstro,
          mood: parseInt(mood, 10),
          stress: parseInt(stress, 10),
          fatigue: parseInt(fatigue, 10),
          data_origin: "MANUAL"
        },
        exercise: exercise
          ? {
              astronaut_id: selectedAstro,
              activity_type: exercise,
              duration_min: parseInt(exerciseMin, 10) || 0,
              data_origin: "MANUAL"
            }
          : null
      });
      setMsg("Check-in saved (MANUAL). Evaluated with deterministic behavioral rules.");
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="screen active">
      <h2>Behavioral Health</h2>
      <div className="grid grid-2">
        <div className="card">
          <h3>
            Daily check-in <span className="tag tag-manual">MANUAL</span>
          </h3>
          <form onSubmit={handleSubmit} className="form-col">
            <label>
              Sleep last night (hours)
              <input
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
                required
              />
            </label>

            <label>
              Sleep quality
              <select value={sleepQuality} onChange={(e) => setSleepQuality(e.target.value)}>
                <option value="good">good</option>
                <option value="fair">fair</option>
                <option value="poor">poor</option>
              </select>
            </label>

            <label>
              Mood (1–10)
              <input
                type="number"
                min="1"
                max="10"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                required
              />
            </label>

            <label>
              Stress (1–10)
              <input
                type="number"
                min="1"
                max="10"
                value={stress}
                onChange={(e) => setStress(e.target.value)}
                required
              />
            </label>

            <label>
              Fatigue (1–10)
              <input
                type="number"
                min="1"
                max="10"
                value={fatigue}
                onChange={(e) => setFatigue(e.target.value)}
                required
              />
            </label>

            <label>
              Exercise today
              <select value={exercise} onChange={(e) => setExercise(e.target.value)}>
                <option value="">None logged</option>
                <option value="Treadmill (T2)">Treadmill (T2)</option>
                <option value="Cycle ergometer">Cycle ergometer</option>
                <option value="Resistance (ARED)">Resistance (ARED)</option>
              </select>
            </label>

            {exercise && (
              <label>
                Exercise duration (min)
                <input
                  type="number"
                  min="0"
                  max="600"
                  value={exerciseMin}
                  onChange={(e) => setExerciseMin(e.target.value)}
                />
              </label>
            )}

            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save check-in"}
            </button>
          </form>
          {msg && <div className="muted mt-2">{msg}</div>}
        </div>

        <div className="card">
          <h3>Trends — selected crew member</h3>
          <div className="mb-3">
            Pattern check: <span className={`sev sev-${summary.behavioral.severity}`}>{summary.behavioral.severity}</span>{" "}
            — {summary.behavioral.explanation}
          </div>

          <h4>Recent sleep logs</h4>
          {astroSleeps.length ? (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Hours</th>
                  <th>Quality</th>
                  <th>Origin</th>
                </tr>
              </thead>
              <tbody>
                {astroSleeps.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.recorded_at).toLocaleDateString()}</td>
                    <td>{s.duration_hours}</td>
                    <td>{s.quality}</td>
                    <td>
                      <span className={`tag tag-${s.data_origin === "SIMULATED" ? "sim" : "manual"}`}>
                        {s.data_origin}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">None yet.</p>
          )}

          <h4 className="mt-4">Recent mood / stress / fatigue</h4>
          {astroMoods.length ? (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Mood</th>
                  <th>Stress</th>
                  <th>Fatigue</th>
                  <th>Origin</th>
                </tr>
              </thead>
              <tbody>
                {astroMoods.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.recorded_at).toLocaleDateString()}</td>
                    <td>{m.mood}/10</td>
                    <td>{m.stress}/10</td>
                    <td>{m.fatigue}/10</td>
                    <td>
                      <span className={`tag tag-${m.data_origin === "SIMULATED" ? "sim" : "manual"}`}>
                        {m.data_origin}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">None yet.</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: "16px" }}>
        <div className="row row-between" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>AI Circadian &amp; Fatigue Analysis</h3>
          <span className="tag tag-nasa">NASA LSDA ACTIWATCH GROUNDING</span>
        </div>
        <p className="muted">
          Analyzes cumulative sleep deficits and fatigue self-reports to recommend operational rest scheduling.
        </p>
        <button onClick={handleAiBehavioral} className="btn" disabled={aiLoading}>
          {aiLoading ? "Evaluating Pattern…" : "✦ AI Evaluate Circadian & Fatigue Pattern"}
        </button>
        {(aiLoading || aiOut) && (
          <div className="assistant-out small" style={{ marginTop: "10px" }}>
            {aiLoading ? "Evaluating circadian stability and fatigue accumulation against NASA LSDA norms..." : aiOut}
          </div>
        )}
      </div>
    </section>
  );
}

