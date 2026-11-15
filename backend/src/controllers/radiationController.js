/**
 * Radiation Controller
 * Implements endpoints for NASA DONKI, Curiosity RAD, and personal dosimetry logs.
 */

const { fetchDonkiEvents, getRadResearchContext, getLsdaCatalogue } = require("../nasa");
const store = require("../services/storeService");

async function getDonkiEvents(req, res) {
  try {
    const type = (req.query.type || "SEP").toUpperCase();
    const { startDate, endDate } = req.query;

    const events = await fetchDonkiEvents(type, startDate, endDate);
    store.setRadiationEvents(events);
    store.logSync("NASA DONKI", "ok", null, events.length);

    res.json({
      success: true,
      event_type: type,
      count: events.length,
      safety_rule: "DONKI space weather events are environmental context, not a crew member's measured dose.",
      data: events
    });
  } catch (err) {
    store.logSync("NASA DONKI", "error", err.message);
    const cached = store.getRadiationEvents();
    res.json({
      success: false,
      error: err.message,
      is_cached: true,
      count: cached.length,
      data: cached
    });
  }
}

function getRadData(req, res) {
  try {
    const radContext = getRadResearchContext();
    res.json({
      success: true,
      data: radContext
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getLsdaData(req, res) {
  try {
    const lsda = getLsdaCatalogue();
    res.json({
      success: true,
      data: lsda
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getRadiationReadings(req, res) {
  try {
    const { astronaut_id } = req.query;
    const readings = store.state.radiation_readings.filter(r => !astronaut_id || r.astronaut_id === astronaut_id);
    res.json({
      success: true,
      count: readings.length,
      data: readings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getDonkiEvents,
  getRadData,
  getLsdaData,
  getRadiationReadings
};

