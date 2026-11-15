/**
 * Behavioral Controller
 */

const store = require("../services/storeService");

function logSleep(req, res) {
  try {
    const { astronaut_id, duration_hours, quality, data_origin } = req.body;
    if (!astronaut_id || duration_hours === undefined) {
      return res.status(400).json({ success: false, error: "Missing required fields: astronaut_id, duration_hours" });
    }

    const dur = parseFloat(duration_hours);
    if (isNaN(dur) || dur < 0 || dur > 24) {
      return res.status(400).json({ success: false, error: "Invalid sleep duration: must be between 0 and 24 hours" });
    }

    const log = store.addSleepLog({
      astronaut_id,
      duration_hours: dur,
      quality: quality || "good",
      data_origin: data_origin || "MANUAL"
    });

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function logMood(req, res) {
  try {
    const { astronaut_id, mood, stress, fatigue, data_origin } = req.body;
    if (!astronaut_id || mood === undefined || stress === undefined || fatigue === undefined) {
      return res.status(400).json({ success: false, error: "Missing required fields: astronaut_id, mood, stress, fatigue" });
    }

    const m = parseInt(mood, 10);
    const s = parseInt(stress, 10);
    const f = parseInt(fatigue, 10);

    if ([m, s, f].some(v => isNaN(v) || v < 1 || v > 10)) {
      return res.status(400).json({ success: false, error: "Mood, stress, and fatigue must be integers between 1 and 10" });
    }

    const log = store.addMoodLog({
      astronaut_id,
      mood: m,
      stress: s,
      fatigue: f,
      data_origin: data_origin || "MANUAL"
    });

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function logExercise(req, res) {
  try {
    const { astronaut_id, activity_type, duration_min, intensity, data_origin } = req.body;
    if (!astronaut_id || !activity_type || duration_min === undefined) {
      return res.status(400).json({ success: false, error: "Missing required fields: astronaut_id, activity_type, duration_min" });
    }

    const d = parseInt(duration_min, 10);
    if (isNaN(d) || d < 0 || d > 600) {
      return res.status(400).json({ success: false, error: "Duration must be between 0 and 600 minutes" });
    }

    const log = store.addExerciseLog({
      astronaut_id,
      activity_type,
      duration_min: d,
      intensity: intensity || "moderate",
      data_origin: data_origin || "MANUAL"
    });

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function getBehavioralSummary(req, res) {
  try {
    const { astronautId } = req.params;
    const summary = store.getBehavioralSummary(astronautId);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  logSleep,
  logMood,
  logExercise,
  getBehavioralSummary
};

