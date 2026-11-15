const express = require("../utils/expressCompat");
const router = express.Router();
const controller = require("../controllers/reportsController");

router.get("/daily", controller.getDailyReport);

module.exports = router;
