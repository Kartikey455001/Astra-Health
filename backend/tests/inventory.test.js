/**
 * NASA Dataset Inventory Integration Tests
 * Validates full ingestion and serving of ASTRA_HEALTH_NASA_Dataset_Inventory.csv
 */

const assert = require("node:assert");
const { describe, it } = require("node:test");
const datasetInventory = require("../src/nasa/datasetInventory");
const store = require("../src/services/storeService");
const nasaController = require("../src/controllers/nasaController");

describe("NASA Dataset Inventory (CSV) Integration", () => {
  it("Loads all 16 master datasets from ASTRA_HEALTH_NASA_Dataset_Inventory.csv", () => {
    const all = datasetInventory.getAllDatasets();
    assert.strictEqual(all.length, 16);
  });

  it("Indexes Inspiration4 human spaceflight datasets (OSD-569 through OSD-575, OSD-687)", () => {
    const osd569 = datasetInventory.getDatasetById("OSD-569");
    assert.ok(osd569);
    assert.strictEqual(osd569.study_title, "Inspiration4 whole blood");
    assert.ok(osd569.assay_or_measurement.includes("CBC"));

    const osd575 = datasetInventory.getDatasetById("OSD-575");
    assert.ok(osd575);
    assert.ok(osd575.study_title.includes("cardiac"));

    const osd687 = datasetInventory.getDatasetById("OSD-687");
    assert.ok(osd687);
    assert.strictEqual(osd687.sample_type, "T-cells");
  });

  it("Indexes Curiosity RAD Mars surface data (MSL-M-RAD-3-RDR-V1.0)", () => {
    const rad = datasetInventory.getDatasetById("MSL-M-RAD-3-RDR-V1.0");
    assert.ok(rad);
    assert.strictEqual(rad.source, "NASA PDS PPI");
    assert.ok(rad.download_or_file_listing_url.includes("pds-ppi.igpp.ucla.edu"));
    assert.strictEqual(rad.ASTRA_use, "Environmental radiation context only; not astronaut personal dosimetry");
  });

  it("Indexes NASA DONKI space weather events (SEP, CME, GST)", () => {
    const sep = datasetInventory.getDatasetById("DONKI-SEP");
    const cme = datasetInventory.getDatasetById("DONKI-CME");
    const gst = datasetInventory.getDatasetById("DONKI-GST");

    assert.ok(sep);
    assert.ok(cme);
    assert.ok(gst);
    assert.strictEqual(sep.source, "NASA DONKI");
    assert.strictEqual(sep.ASTRA_use, "Space-weather hazard context; not crew dose");
  });

  it("Indexes NASA NLSP/LSDA life sciences archive", () => {
    const lsda = datasetInventory.getDatasetById("NLSP/LSDA");
    assert.ok(lsda);
    assert.ok(lsda.assay_or_measurement.includes("Actiwatch"));
  });

  it("Provides clinical biomarker context derived from OSD-575 and OSD-569", () => {
    const biomarkers = datasetInventory.getBiomarkerContext();
    assert.ok(biomarkers.clinical_panels.length >= 4);
    assert.ok(biomarkers.clinical_panels.some(p => p.panel.includes("Cardiac")));
    assert.ok(biomarkers.clinical_panels.some(p => p.panel.includes("Metabolic")));
    assert.ok(biomarkers.clinical_panels.some(p => p.panel.includes("CBC")));
  });

  it("Controller endpoint getDatasetInventory returns full catalog with count", () => {
    let responseData = null;
    const mockReq = { query: {} };
    const mockRes = {
      json: (d) => { responseData = d; }
    };
    nasaController.getDatasetInventory(mockReq, mockRes);
    assert.ok(responseData.success);
    assert.strictEqual(responseData.count, 16);
    assert.strictEqual(responseData.master_inventory, "ASTRA_HEALTH_NASA_Dataset_Inventory.csv");
  });

  it("Controller endpoint getBiomarkersContext returns clinical panel mappings", () => {
    let responseData = null;
    const mockReq = {};
    const mockRes = {
      json: (d) => { responseData = d; }
    };
    nasaController.getBiomarkersContext(mockReq, mockRes);
    assert.ok(responseData.success);
    assert.ok(responseData.data.clinical_panels.length >= 4);
  });

  it("Backend store state holds 16 nasa_datasets and 16 research_records from inventory", () => {
    assert.strictEqual(store.state.nasa_datasets.length, 16);
    assert.strictEqual(store.state.research_records.length, 16);
  });
});

