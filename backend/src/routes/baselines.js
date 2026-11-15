const express = require("../utils/expressCompat");
const router = express.Router();
const store = require("../services/storeService");

router.get("/", (req, res) => {
  const { astronaut_id } = req.query;
  const baselines = store.getBaselines(astronaut_id);
  res.json({ success: true, count: baselines.length, data: baselines });
});

router.put("/", (req, res) => {
  const { astronaut_id, metric, baseline_value, unit } = req.body;
  if (!astronaut_id || !metric || baseline_value === undefined) {
    return res.status(400).json({ success: false, error: "Missing required fields: astronaut_id, metric, baseline_value" });
  }
  const updated = store.setBaseline(astronaut_id, metric, baseline_value, unit);
  res.json({ success: true, data: updated });
});

module.exports = router;
