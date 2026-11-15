const express = require("../utils/expressCompat");
const router = express.Router();
const controller = require("../controllers/radiationController");

router.get("/donki", controller.getDonkiEvents);
router.get("/rad", controller.getRadData);
router.get("/lsda", controller.getLsdaData);
router.get("/readings", controller.getRadiationReadings);

module.exports = router;
