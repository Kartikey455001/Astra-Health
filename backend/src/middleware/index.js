/**
 * Validation & Provenance Middleware
 */

const { isValidVital, METRICS } = require("../engines/healthEngine");

function validateVitalInput(req, res, next) {
  const { metric, value } = req.body;
  if (!metric || value === undefined) {
    return res.status(400).json({ success: false, error: "Metric and value are required" });
  }

  if (!isValidVital(metric, value)) {
    const meta = METRICS[metric];
    return res.status(400).json({
      success: false,
      error: `Value ${value} is outside valid physiological range for ${meta?.label || metric} (${meta?.min} - ${meta?.max} ${meta?.unit}).`
    });
  }

  next();
}

function corsMiddleware(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
}

function errorHandler(err, req, res, next) {
  console.error("API Error:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || "Internal server error"
  });
}

module.exports = {
  validateVitalInput,
  corsMiddleware,
  errorHandler
};

