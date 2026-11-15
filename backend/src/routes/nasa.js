const express = require("../utils/expressCompat");
const router = express.Router();
const controller = require("../controllers/nasaController");

// CSV Dataset Inventory Routes
router.get("/inventory", controller.getDatasetInventory);
router.get("/inventory/:id", controller.getDatasetById);
router.get("/biomarkers", controller.getBiomarkersContext);
router.get("/radiation-context", controller.getRadiationInventoryContext);
router.get("/behavioral-context", controller.getBehavioralInventoryContext);

// Dynamic Ingestion & Search
router.get("/osdr", controller.searchOsdrEndpoint);
router.all("/ntrs", controller.searchNtrsEndpoint);
router.get("/research", controller.searchResearchHub);
router.get("/sync-status", controller.getSyncStatus);
router.post("/sync-all", controller.triggerSyncAll);

module.exports = router;
