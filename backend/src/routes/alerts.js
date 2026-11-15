const express = require("../utils/expressCompat");
const router = express.Router();
const controller = require("../controllers/alertsController");

router.get("/", controller.getAlerts);
router.patch("/:id", controller.updateAlertStatus);

module.exports = router;
