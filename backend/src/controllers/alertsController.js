/**
 * Alerts Controller
 */

const store = require("../services/storeService");

function getAlerts(req, res) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 30;
    const alerts = store.getAlerts(limit);
    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function updateAlertStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const alert = store.state.alerts.find(a => a.id === id);
    if (!alert) return res.status(404).json({ success: false, error: "Alert not found" });

    alert.status = status || "acknowledged";
    if (status === "resolved") alert.resolved_at = new Date().toISOString();

    store.save();
    store.notify("alert_updated", alert);

    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getAlerts,
  updateAlertStatus
};

