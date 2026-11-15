const express = require("../utils/expressCompat");
const router = express.Router();
const controller = require("../controllers/behavioralController");

router.post("/sleep", controller.logSleep);
router.post("/mood", controller.logMood);
router.post("/exercise", controller.logExercise);
router.get("/:astronautId", controller.getBehavioralSummary);

module.exports = router;
