/**
 * Unified NASA Data Access Layer
 * Integrates strictly the 5 NASA datasets named in the blueprint:
 * 1. NASA OSDR (Open Science Data Repository)
 * 2. NASA DONKI (Space Weather)
 * 3. Curiosity RAD (Mars Radiation)
 * 4. NASA LSDA (Life Sciences Data Archive)
 * 5. NASA NTRS (Technical Reports Server)
 */

const { fetchDonkiEvents } = require("./donkiClient");
const { searchOsdr, CURATED_OSDR_STUDIES } = require("./osdrClient");
const { getRadResearchContext, RAD_METADATA } = require("./radClient");
const { getLsdaCatalogue, LSDA_CATALOGUE } = require("./lsdaClient");
const { searchNtrs, CURATED_NTRS_REPORTS } = require("./ntrsClient");

// In-memory cache for fast response and offline resilience
const CACHE = {
  DONKI: { records: [], last_synced_at: null, status: "pending" },
  OSDR:  { records: [], last_synced_at: null, status: "pending" },
  NTRS:  { records: [], last_synced_at: null, status: "pending" },
  RAD:   { records: [getRadResearchContext()], last_synced_at: new Date().toISOString(), status: "ok" },
  LSDA:  { records: [getLsdaCatalogue()], last_synced_at: new Date().toISOString(), status: "ok" }
};

async function syncDonki(eventType = "SEP") {
  try {
    const events = await fetchDonkiEvents(eventType);
    CACHE.DONKI = {
      records: events,
      last_synced_at: new Date().toISOString(),
      status: "ok",
      eventType
    };
    return { ok: true, count: events.length, data: events };
  } catch (err) {
    CACHE.DONKI.status = "error";
    CACHE.DONKI.error_message = err.message;
    return { ok: false, error: err.message, cached: CACHE.DONKI.records };
  }
}

async function syncOsdr(term = "astronaut bone loss") {
  try {
    const studies = await searchOsdr(term, 10);
    CACHE.OSDR = {
      records: studies,
      last_synced_at: new Date().toISOString(),
      status: "ok",
      term
    };
    return { ok: true, count: studies.length, data: studies };
  } catch (err) {
    CACHE.OSDR.status = "error";
    CACHE.OSDR.error_message = err.message;
    return { ok: false, error: err.message, cached: CACHE.OSDR.records };
  }
}

async function syncNtrs(term = "astronaut health") {
  try {
    const reports = await searchNtrs(term, 10);
    CACHE.NTRS = {
      records: reports,
      last_synced_at: new Date().toISOString(),
      status: "ok",
      term
    };
    return { ok: true, count: reports.length, data: reports };
  } catch (err) {
    CACHE.NTRS.status = "error";
    CACHE.NTRS.error_message = err.message;
    return { ok: false, error: err.message, cached: CACHE.NTRS.records };
  }
}

async function searchAllResearch(query = "bone loss microgravity") {
  const [osdrRes, ntrsRes] = await Promise.allSettled([
    searchOsdr(query, 6),
    searchNtrs(query, 6)
  ]);

  const osdrStudies = osdrRes.status === "fulfilled" ? osdrRes.value : [];
  const ntrsReports = ntrsRes.status === "fulfilled" ? ntrsRes.value : [];

  return {
    query,
    retrieved_at: new Date().toISOString(),
    total: osdrStudies.length + ntrsReports.length,
    results: [...osdrStudies, ...ntrsReports],
    sources: {
      osdr: { count: osdrStudies.length, ok: osdrRes.status === "fulfilled" },
      ntrs: { count: ntrsReports.length, ok: ntrsRes.status === "fulfilled" },
      rad:  { citation: RAD_METADATA.published_measurements[0].citation },
      lsda: { portal: LSDA_CATALOGUE.portal_url }
    }
  };
}

module.exports = {
  fetchDonkiEvents,
  searchOsdr,
  getRadResearchContext,
  getLsdaCatalogue,
  searchNtrs,
  syncDonki,
  syncOsdr,
  syncNtrs,
  searchAllResearch,
  CACHE,
  RAD_METADATA,
  LSDA_CATALOGUE,
  CURATED_OSDR_STUDIES,
  CURATED_NTRS_REPORTS
};

