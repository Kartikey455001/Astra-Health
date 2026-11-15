/**
 * Astronauts Controller
 */

const store = require("../services/storeService");

function listAstronauts(req, res) {
  try {
    const crew = store.getAstronauts();
    const evaluated = crew.map(a => {
      const summary = store.evaluateCrewMember(a.id);
      const hrEval = summary.evals.find(e => e.metric === "heart_rate");
      return {
        ...a,
        overall_severity: summary.overall,
        latest_heart_rate: hrEval?.latest?.value || null,
        heart_rate_unit: hrEval?.latest?.unit || "BPM",
        heart_rate_deviation: hrEval?.deviation_pct ?? null,
        heart_rate_severity: hrEval?.severity || "NORMAL",
        evaluations: summary.evals,
        behavioral: summary.behavioral
      };
    });

    res.json({
      success: true,
      count: evaluated.length,
      data: evaluated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getAstronautStatus(req, res) {
  try {
    const { id } = req.params;
    const astro = store.getAstronaut(id);
    if (!astro) return res.status(404).json({ success: false, error: "Astronaut not found" });

    const summary = store.evaluateCrewMember(id);
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  listAstronauts,
  getAstronautStatus
};

