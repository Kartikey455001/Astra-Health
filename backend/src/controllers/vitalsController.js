/**
 * Vitals Controller
 */

const store = require("../services/storeService");
const { isValidVital, METRICS } = require("../engines/healthEngine");

function getVitals(req, res) {
  try {
    const { astronaut_id, metric, limit } = req.query;
    const records = store.getVitals(astronaut_id, metric, limit ? parseInt(limit, 10) : 50);
    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function addVital(req, res) {
  try {
    const { astronaut_id, metric, value, unit, quality_status, data_origin } = req.body;

    if (!astronaut_id || !metric || value === undefined) {
      return res.status(400).json({ success: false, error: "Missing required fields: astronaut_id, metric, value" });
    }

    if (!isValidVital(metric, value)) {
      const meta = METRICS[metric];
      return res.status(400).json({
        success: false,
        error: `Value ${value} is outside valid physiological range for ${meta?.label || metric} (${meta?.min} - ${meta?.max} ${meta?.unit}).`
      });
    }

    const reading = store.addVital({
      astronaut_id,
      metric,
      value: parseFloat(value),
      unit: unit || METRICS[metric]?.unit,
      quality_status: quality_status || "validated",
      data_origin: data_origin || "MANUAL"
    });

    const evalResult = store.evaluateCrewMember(astronaut_id);

    res.status(201).json({
      success: true,
      data: reading,
      evaluation: evalResult
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function simulateTick(req, res) {
  try {
    const evaluated = store.tickSimulation();
    res.json({
      success: true,
      message: "Simulation tick generated for all crew members",
      data: evaluated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getVitals,
  addVital,
  simulateTick
};

