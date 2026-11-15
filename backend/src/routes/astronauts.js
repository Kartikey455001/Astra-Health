const express = require("../utils/expressCompat");
const router = express.Router();
const controller = require("../controllers/astronautsController");

router.get("/", controller.listAstronauts);
router.get("/:id", controller.getAstronautStatus);

module.exports = router;
