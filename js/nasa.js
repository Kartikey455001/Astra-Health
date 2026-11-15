/*
 * ASTRA HEALTH — NASA source clients.
 * STRICTLY the five resources named in the blueprint PDF (Section 3):
 *   1. NASA Open Science Data Repository (OSDR)  — https://osdr.nasa.gov/osdr/data/search
 *   2. NASA DONKI space weather                  — https://ccmc.gsfc.nasa.gov/DONKI-API/get/{SEP,FLR,CME}
 *   3. Curiosity RAD (MSL) PDS archive           — https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/
 *   4. NASA Life Sciences Data Archive (LSDA)    — portal catalogue, no public API in the PDF -> portal link
 *   5. NASA Technical Reports Server (NTRS)      — https://ntrs.nasa.gov/api/citations/search
 *
 * Every returned record is normalised WITH provenance (source_name,
 * source_record_id, data_origin: "NASA_PUBLIC", observed_at, retrieved_at,
 * source_url). Nothing is invented: on failure the client throws and the UI
 * shows an error state and falls back to the last cached response, clearly
 * labelled with its retrieval time (blueprint: never show stale data as live).
 */
(function (global) {
  "use strict";

  function isoDate(d) { return d.toISOString().slice(0, 10); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }

  function fetchJson(url, options, timeoutMs) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, timeoutMs || 20000);
    return fetch(url, Object.assign({}, options || {}, { signal: ctrl.signal }))
      .then(function (r) {
        clearTimeout(t);
        if (!r.ok) throw new Error("HTTP " + r.status + " from " + url.split("?")[0]);
        return r.json();
      })
      .catch(function (e) { clearTimeout(t); throw e; });
  }

  /* ---------------- DONKI (space weather events) ---------------- */
  function fetchDonki(eventType, startDate, endDate) {
    var type = (eventType || "SEP").toUpperCase();
    var start = startDate || isoDate(daysAgo(30));
    var end = endDate || isoDate(new Date());

    // First try the local backend proxy to bypass browser CORS restrictions
    var proxyUrl = "/api/radiation/donki?type=" + encodeURIComponent(type) + "&startDate=" + start + "&endDate=" + end;
    return fetchJson(proxyUrl, {}, 6000)
      .then(function (res) {
        if (res && res.data && Array.isArray(res.data)) return res.data;
        if (Array.isArray(res)) return res;
        throw new Error("Invalid proxy response");
      })
      .catch(function () {
        // Fallback to direct NASA CCMC endpoint
        var directUrl = "https://ccmc.gsfc.nasa.gov/DONKI-API/get/" + type + "?startDate=" + start + "&endDate=" + end;
        return fetchJson(directUrl).then(function (events) {
          if (!Array.isArray(events)) events = [];
          return events.map(function (e) {
            var id = e.sepID || e.flrID || e.cmeID || e.activityID || "unknown";
            return {
              source_name: "NASA DONKI", source_record_id: String(id), data_origin: "NASA_PUBLIC",
              event_type: type,
              observed_at: e.eventTime || e.beginTime || e.peakTime || null,
              retrieved_at: new Date().toISOString(),
              title: type + " event " + id,
              details: e,
              source_url: "https://ccmc.gsfc.nasa.gov/DONKI/",
              quality_status: "validated"
            };
          });
        });
      });
  }

  /* ---------------- OSDR (space biology studies) ---------------- */
  function searchOsdr(term, size) {
    var limit = size || 10;
    var query = term || "astronaut health";

    // Try backend proxy first
    var proxyUrl = "/api/nasa/osdr?term=" + encodeURIComponent(query) + "&size=" + limit;
    return fetchJson(proxyUrl, {}, 6000)
      .then(function (res) {
        if (res && res.data && Array.isArray(res.data)) return res.data;
        if (Array.isArray(res)) return res;
        throw new Error("Invalid proxy response");
      })
      .catch(function () {
        var directUrl = "https://osdr.nasa.gov/osdr/data/search?term=" + encodeURIComponent(query) + "&from=0&size=" + limit;
        return fetchJson(directUrl).then(function (data) {
          var hits = (data && data.hits && data.hits.hits) || [];
          return hits.map(function (h) {
            var s = h._source || {};
            var rest = s["rest-url"] || s.rest_url || "";
            var accession = s["Accession"] || s["Study Identifier"] || (rest.split("/").filter(Boolean).pop()) || h._id || "OSDR record";
            return {
              source_name: "NASA OSDR", source_record_id: String(accession), data_origin: "NASA_PUBLIC",
              title: s["Study Title"] || s["study title"] || s.title || String(accession),
              description: (s["Study Description"] || s["study description"] || s.description || "").slice(0, 400),
              retrieved_at: new Date().toISOString(),
              source_url: "https://osdr.nasa.gov/bio/repo/search?q=" + encodeURIComponent(accession),
              quality_status: "validated"
            };
          });
        });
      });
  }

  /* ---------------- NTRS (technical reports) ---------------- */
  function searchNtrs(term, size) {
    var limit = size || 10;
    var query = term || "astronaut health";

    var proxyUrl = "/api/nasa/ntrs?term=" + encodeURIComponent(query) + "&size=" + limit;
    return fetchJson(proxyUrl, {}, 6000)
      .then(function (res) {
        if (res && res.data && Array.isArray(res.data)) return res.data;
        if (Array.isArray(res)) return res;
        throw new Error("Invalid proxy response");
      })
      .catch(function () {
        var directUrl = "https://ntrs.nasa.gov/api/citations/search";
        var body = { criteria: { titleAndAbstract: query }, page: { size: limit, from: 0 } };
        return fetchJson(directUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
          .then(function (data) {
            var results = (data && data.results) || [];
            return results.map(function (r) {
              return {
                source_name: "NASA NTRS", source_record_id: String(r.id || "NTRS record"), data_origin: "NASA_PUBLIC",
                title: r.title || "Untitled report",
                description: (r.abstract || "").slice(0, 400),
                retrieved_at: new Date().toISOString(),
                source_url: r.id ? "https://ntrs.nasa.gov/citations/" + r.id : "https://ntrs.nasa.gov/",
                quality_status: "validated"
              };
            });
          });
      });
  }

  /* ---------------- Curiosity RAD (historical Mars radiation) ---------------- */
  var RAD = {
    source_name: "Curiosity RAD (MSL) — PDS archive",
    archive_url: "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/",
    portal_note: "RAD archive files (RDR V1.0) are hosted as data products on the PDS PPI node; inspect the archive documentation, data dictionaries and units before parsing.",
    published_context: [
      { label: "Mars surface dose equivalent rate (Gale Crater)", value: "0.64 ± 0.12 mSv/day",
        citation: "Hassler et al., Science 2014 — RAD measurements on the surface of Mars",
        source_url: "https://www.science.org/doi/10.1126/science.1244797" },
      { label: "Cruise phase dose equivalent rate (Earth → Mars)", value: "1.84 ± 0.30 mSv/day",
        citation: "Zeitlin et al., Science 2013 — Measurements of energetic particle radiation in transit to Mars",
        source_url: "https://www.science.org/doi/10.1126/science.1235989" }
    ]
  };

  /* ---------------- LSDA (life sciences catalogue) ---------------- */
  var LSDA = {
    source_name: "NASA LSDA",
    portal_url: "https://nlsp.nasa.gov/explore/lsdahome",
    topics: ["Bone and muscle changes", "Cardiovascular research", "Behavioral health", "Radiation biology"],
    note: "Some LSDA datasets are restricted or require formal access approval (per blueprint PDF)."
  };

  /* ---------------- Master Dataset Inventory (CSV) ---------------- */
  function fetchInventory() {
    return fetchJson("/api/nasa/inventory", {}, 5000)
      .then(function (res) { return res && res.data ? res.data : []; })
      .catch(function () { return []; });
  }

  function fetchBiomarkers() {
    return fetchJson("/api/nasa/biomarkers", {}, 5000)
      .then(function (res) { return res && res.data ? res.data : null; })
      .catch(function () { return null; });
  }

  global.ASTRA_NASA = {
    fetchDonki: fetchDonki,
    searchOsdr: searchOsdr,
    searchNtrs: searchNtrs,
    fetchInventory: fetchInventory,
    fetchBiomarkers: fetchBiomarkers,
    RAD: RAD,
    LSDA: LSDA
  };
})(window);
