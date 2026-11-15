const express = require("../utils/expressCompat");
const router = express.Router();
const controller = require("../controllers/vitalsController");

router.get("/", controller.getVitals);
router.post("/", controller.addVital);
router.post("/simulate-tick", controller.simulateTick);

module.exports = router;
