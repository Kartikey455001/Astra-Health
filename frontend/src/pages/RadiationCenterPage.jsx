import React, { useState } from "react";
import { useAstra } from "../store/astraStore";
import { api } from "../services/api";

export function RadiationCenterPage() {
  const { selectedAstro, radiationEvents, donkiLoading, donkiSummary, fetchDonki } = useAstra();
  const [eventType, setEventType] = useState("SEP");
  const [aiOut, setAiOut] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const handleFetch = () => {
    fetchDonki(eventType);
  };

  const handleAiRadiation = async () => {
    setAiLoading(true);
    try {
      const res = await api.getRadiationAi({
        astronaut_id: selectedAstro,
        model: "gemini-3.8-flash"
      });
      setAiOut(res.advisory || res.explanation || "Radiation assessment completed.");
    } catch (err) {
      setAiOut(`Radiation advisory notice: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <section className="screen active">
      <h2>Radiation Command Center</h2>
      <div className="grid grid-2">
        <div className="card">
          <div className="panel-head">
            <h3>
              NASA DONKI Event Feed <span className="tag tag-nasa">NASA_PUBLIC</span>
            </h3>
          </div>
          <div className="form-row">
            <label>
              Event type
              <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="SEP">SEP — Solar Energetic Particles</option>
                <option value="FLR">FLR — Solar Flares</option>
                <option value="CME">CME — Coronal Mass Ejections</option>
                <option value="GST">GST — Geomagnetic Storms</option>
              </select>
            </label>
            <button onClick={handleFetch} className="btn" disabled={donkiLoading}>
              {donkiLoading ? "Fetching…" : "Fetch last 30 days"}
            </button>
          </div>

          <div className="muted mb-2">{donkiSummary}</div>

          <div>
            {radiationEvents.length ? (
              radiationEvents.slice(0, 8).map((e, idx) => (
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
              ))
            ) : (
              <p className="muted">No events recorded for this observation window.</p>
            )}
          </div>

          <p className="fineprint">
            Workflow on a significant event: notify the crew, review the mission's approved protective-action procedure, and log the event. ASTRA never converts a DONKI event into a personal dose.
          </p>
        </div>

        <div className="card">
          <h3>
            Curiosity RAD — Historical Mars Radiation <span className="tag tag-nasa">NASA_PUBLIC</span>
          </h3>
          <p className="text-sm text-gray-300">
            RAD archive files (RDR V1.0) are hosted as data products on the PDS PPI node; inspect the archive documentation, data dictionaries and units before parsing.
          </p>
          <p>
            <a
              href="https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#38b6ff] underline"
            >
              Open the RAD PDS archive (MSL-M-RAD-3-RDR-V1.0)
            </a>{" "}
            <span className="tag tag-nasa">NASA_PUBLIC</span>
          </p>

          <h4>Published reference values (research context — not crew telemetry)</h4>
          <div className="event-item">
            <strong>Mars surface dose equivalent rate (Gale Crater):</strong> 0.64 ± 0.12 mSv/day
            <br />
            <span className="muted">Hassler et al., Science 2014 — RAD measurements on the surface of Mars</span>
            <br />
            <a href="https://www.science.org/doi/10.1126/science.1244797" target="_blank" rel="noopener noreferrer">
              Publisher page ↗
            </a>
          </div>

          <div className="event-item">
            <strong>Cruise phase dose equivalent rate (Earth → Mars):</strong> 1.84 ± 0.30 mSv/day
            <br />
            <span className="muted">Zeitlin et al., Science 2013 — Measurements of energetic particle radiation in transit to Mars</span>
            <br />
            <a href="https://www.science.org/doi/10.1126/science.1235989" target="_blank" rel="noopener noreferrer">
              Publisher page ↗
            </a>
          </div>

          <h3 className="mt-4">
            NASA LSDA — Life Sciences Catalogue <span className="tag tag-nasa">NASA_PUBLIC</span>
          </h3>
          <p className="text-sm text-gray-300">
            Some LSDA datasets are restricted or require formal access approval (per blueprint PDF).
          </p>
          <p className="text-sm text-gray-300">
            Topics: Bone and muscle changes · Cardiovascular research · Behavioral health · Radiation biology
          </p>
          <p>
            <a
              href="https://nlsp.nasa.gov/explore/lsdahome"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#38b6ff] underline"
            >
              Open the NASA LSDA catalogue ↗
            </a>
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "16px" }}>
        <div className="row row-between" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>AI Space Weather &amp; Shielding Advisory</h3>
          <span className="tag tag-nasa">DONKI + RAD + GEMINI</span>
        </div>
        <p className="muted">
          Translates detected solar events and Curiosity RAD benchmarks into mission operational advisories.
        </p>
        <button onClick={handleAiRadiation} className="btn" disabled={aiLoading}>
          {aiLoading ? "Evaluating Situation…" : "✦ AI Evaluate Radiation Situation"}
        </button>
        {(aiLoading || aiOut) && (
          <div className="assistant-out small" style={{ marginTop: "10px" }}>
            {aiLoading ? "Synthesizing NASA DONKI space weather with Curiosity RAD Mars surface measurements..." : aiOut}
          </div>
        )}
      </div>
    </section>
  );
}

