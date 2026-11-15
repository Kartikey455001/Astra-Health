/**
 * NASA Data Ingestion Controller
 * Proxies and synchronizes with NASA OSDR, DONKI, NTRS, RAD, and LSDA.
 * Strictly serves all datasets from ASTRA_HEALTH_NASA_Dataset_Inventory.csv.
 */

const { searchOsdr, searchNtrs, searchAllResearch, syncDonki, syncOsdr, syncNtrs } = require("../nasa");
const datasetInventory = require("../nasa/datasetInventory");
const store = require("../services/storeService");

async function searchOsdrEndpoint(req, res) {
  try {
    const term = req.query.term || "bone loss";
    const size = parseInt(req.query.size || "10", 10);
    const studies = await searchOsdr(term, size);
    store.logSync("NASA OSDR", "ok", null, studies.length);
    res.json({
      success: true,
      source: "NASA OSDR",
      term,
      count: studies.length,
      data: studies
    });
  } catch (err) {
    store.logSync("NASA OSDR", "error", err.message);
    res.status(502).json({ success: false, error: err.message });
  }
}

async function searchNtrsEndpoint(req, res) {
  try {
    const term = req.query.term || req.body?.term || "astronaut health";
    const size = parseInt(req.query.size || req.body?.size || "10", 10);
    const reports = await searchNtrs(term, size);
    store.logSync("NASA NTRS", "ok", null, reports.length);
    res.json({
      success: true,
      source: "NASA NTRS",
      term,
      count: reports.length,
      data: reports
    });
  } catch (err) {
    store.logSync("NASA NTRS", "error", err.message);
    res.status(502).json({ success: false, error: err.message });
  }
}

async function searchResearchHub(req, res) {
  try {
    const query = req.query.q || req.query.query || "bone loss microgravity";
    const results = await searchAllResearch(query);

    // Also include matching datasets from the inventory CSV
    const inventoryMatches = datasetInventory.searchDatasets(query);

    res.json({
      success: true,
      ...results,
      inventory_matches: inventoryMatches.map(m => ({
        source: m.source,
        dataset_id: m.dataset_id,
        title: m.study_title,
        domain: m.domain,
        assay: m.assay_or_measurement,
        sample_type: m.sample_type,
        url: m.study_page_url || m.download_or_file_listing_url,
        citation: m.citation_url,
        astra_use: m.ASTRA_use,
        verification_status: m.verification_status
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getSyncStatus(req, res) {
  try {
    const logs = store.getSyncLogs();
    res.json({
      success: true,
      last_updated: store.state.last_updated,
      data: logs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function triggerSyncAll(req, res) {
  try {
    const [donkiRes, osdrRes, ntrsRes] = await Promise.allSettled([
      syncDonki("SEP"),
      syncOsdr("astronaut bone loss"),
      syncNtrs("astronaut health countermeasures")
    ]);

    res.json({
      success: true,
      message: "Sync cycle complete across NASA sources",
      results: {
        donki: donkiRes.status === "fulfilled" ? donkiRes.value : { error: donkiRes.reason?.message },
        osdr:  osdrRes.status === "fulfilled"  ? osdrRes.value  : { error: osdrRes.reason?.message },
        ntrs:  ntrsRes.status === "fulfilled"  ? ntrsRes.value  : { error: ntrsRes.reason?.message }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Endpoints for ASTRA_HEALTH_NASA_Dataset_Inventory.csv
 */
function getDatasetInventory(req, res) {
  try {
    const { domain, source, q } = req.query;
    let items = datasetInventory.getAllDatasets();

    if (q) items = datasetInventory.searchDatasets(q);
    if (domain) items = items.filter(d => d.domain.toLowerCase().includes(domain.toLowerCase()));
    if (source) items = items.filter(d => d.source.toLowerCase().includes(source.toLowerCase()));

    res.json({
      success: true,
      master_inventory: "ASTRA_HEALTH_NASA_Dataset_Inventory.csv",
      count: items.length,
      data: items
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getDatasetById(req, res) {
  try {
    const { id } = req.params;
    const item = datasetInventory.getDatasetById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: `Dataset ${id} not found in inventory` });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getBiomarkersContext(req, res) {
  try {
    const biomarkers = datasetInventory.getBiomarkerContext();
    res.json({ success: true, data: biomarkers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getRadiationInventoryContext(req, res) {
  try {
    const radContext = datasetInventory.getRadiationInventoryContext();
    res.json({ success: true, data: radContext });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getBehavioralInventoryContext(req, res) {
  try {
    const behavContext = datasetInventory.getBehavioralInventoryContext();
    res.json({ success: true, data: behavContext });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  searchOsdrEndpoint,
  searchNtrsEndpoint,
  searchResearchHub,
  getSyncStatus,
  triggerSyncAll,
  getDatasetInventory,
  getDatasetById,
  getBiomarkersContext,
  getRadiationInventoryContext,
  getBehavioralInventoryContext
};
