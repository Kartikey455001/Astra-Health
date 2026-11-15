import React, { useState } from "react";
import { useAstra } from "../store/astraStore";
import { api } from "../services/api";

export function AiAssistantPage() {
  const { selectedAstro, astronauts, evaluateCrewMember } = useAstra();
  const [customQuery, setCustomQuery] = useState("");
  const [researchQuery, setResearchQuery] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [citations, setCitations] = useState([]);

  const activeAstro = astronauts.find((a) => a.id === selectedAstro) || astronauts[0];

  const handleAsk = async (kind) => {
    setLoading(true);
    setCitations([]);
    try {
      const res = await api.explainHealth({
        astronaut_id: selectedAstro,
        kind
      });

      if (res.explanation) {
        setOutput(res.explanation);
        if (res.citations) setCitations(res.citations);
      } else {
        setOutput("No response generated.");
      }
    } catch (err) {
      setOutput(`Error contacting assistant: ${err.message}. Showing local rules engine facts.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAsk = async () => {
    const q = customQuery.trim();
    if (!q) return;
    setLoading(true);
    setCitations([]);
    try {
      const res = await api.queryAssistant({
        query: q,
        astronaut_id: selectedAstro
      });

      let text = res.answer || res.explanation || "No response generated.";
      if (res.source) text += `\n\n— Powered by: ${res.source}`;
      setOutput(text);
      if (res.inventory_matches) {
        setCitations(
          res.inventory_matches.map((m) => ({
            title: m.study_title,
            source: m.source,
            accession: m.dataset_id,
            citation: m.ASTRA_use,
            description: m.domain + " | " + m.sample_type,
            url: m.study_page_url
          }))
        );
      }
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResearch = async () => {
    const q = researchQuery.trim() || "astronaut bone loss";
    setLoading(true);
    setOutput(`Searching NASA NTRS + OSDR for: "${q}"…`);
    try {
      const res = await api.searchResearch(q);
      if (res.results && res.results.length) {
        setCitations(res.results);
        setOutput(`Found ${res.results.length} scientific citations across NASA OSDR and NTRS.`);
      } else {
        setOutput("No live research records found. Try searching for 'bone loss', 'muscle atrophy', or 'cardiovascular'.");
      }
    } catch (err) {
      setOutput(`Search error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="screen active">
      <h2>AI Health Assistant</h2>
      <p className="muted">
        The assistant <strong>explains</strong> the rules engine's output and retrieves cited NASA research. It never diagnoses and never overrides the engine. Explanations below are generated deterministically and grounded in peer-reviewed NASA studies — no internet or AI key needed. Optionally add your own Gemini API key to phrase the same facts in natural language (key stays in this tab's memory, is never stored, and AI text is shown only if every number matches the underlying records).
      </p>

      <div className="card">
        <h3>Ask about {activeAstro.name} ({activeAstro.role})</h3>
        <div className="chips">
          <button className="chip" onClick={() => handleAsk("status")} disabled={loading}>
            What is their current status?
          </button>
          <button className="chip" onClick={() => handleAsk("compare")} disabled={loading}>
            Compare all crew members
          </button>
          <button className="chip" onClick={() => handleAsk("hr")} disabled={loading}>
            Explain the heart-rate trend
          </button>
          <button className="chip" onClick={() => handleAsk("sleep")} disabled={loading}>
            Explain the sleep &amp; fatigue pattern
          </button>
          <button className="chip" onClick={() => handleAsk("radiation")} disabled={loading}>
            What space-weather context should we consider?
          </button>
          <button className="chip" onClick={() => handleAsk("summary")} disabled={loading}>
            Give me today's summary
          </button>
        </div>

        <div className="form-row">
          <label className="grow">
            Ask any space medicine or mission health question
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomAsk()}
              placeholder="e.g. Why is Commander's heart rate elevated? What are Inspiration4 OSD-575 cardiac findings?"
            />
          </label>
          <button onClick={handleCustomAsk} className="btn" disabled={loading}>
            Ask Gemini AI
          </button>
        </div>

        <div className="form-row">
          <label className="grow">
            Research question for NASA NTRS / OSDR
            <input
              type="text"
              value={researchQuery}
              onChange={(e) => setResearchQuery(e.target.value)}
              placeholder="e.g. bone loss microgravity countermeasures"
            />
          </label>
          <button onClick={handleSearchResearch} className="btn" disabled={loading}>
            Search NASA research
          </button>
        </div>

        <div className="assistant-out mt-3">
          {loading ? "Analyzing telemetry & NASA scientific knowledge base…" : output || "Select a query chip or search NASA publications above."}
        </div>

        {citations.length > 0 && (
          <div className="mt-4">
            <h4>Cited NASA Research Studies</h4>
            {citations.map((c, i) => (
              <div key={i} className="research-item">
                <strong>{c.title}</strong> <span className="tag tag-nasa">NASA_PUBLIC</span>
                <br />
                <span className="muted">
                  {c.source} · Accession {c.accession || c.source_record_id || "N/A"} · {c.citation}
                </span>
                {c.description && <div className="mt-1 text-xs text-gray-300">{c.description}</div>}
                {c.url && (
                  <div className="mt-1">
                    <a href={c.url} target="_blank" rel="noopener noreferrer">
                      Open source record ↗
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

