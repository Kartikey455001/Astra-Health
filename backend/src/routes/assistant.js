const express = require("../utils/expressCompat");
const router = express.Router();
const controller = require("../controllers/assistantController");

router.all("/explain", controller.explain);
router.all("/rephrase", controller.explain);
router.all("/query", controller.query);
router.all("/vital-trend", controller.explainVitalTrend);
router.all("/radiation-assessment", controller.assessRadiation);
router.all("/behavioral-assessment", controller.assessBehavioral);
router.all("/daily-briefing", controller.generateDailyBriefing);

module.exports = router;
