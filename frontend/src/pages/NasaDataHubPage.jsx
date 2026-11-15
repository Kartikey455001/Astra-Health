import React, { useState, useEffect } from "react";
import { useAstra } from "../store/astraStore";
import { api } from "../services/api";

export function NasaDataHubPage() {
  const { syncLogs, refreshState } = useAstra();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("bone loss");
  const [searchResults, setSearchResults] = useState([]);

  // Inventory state
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [inventorySearch, setInventorySearch] = useState("");
  const [biomarkers, setBiomarkers] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);

  useEffect(() => {
    async function loadInventory() {
      try {
        const [invRes, bioRes] = await Promise.all([
          api.getDatasetInventory(),
          api.getBiomarkersContext()
        ]);
        if (invRes && invRes.data) setInventory(invRes.data);
        if (bioRes && bioRes.data) setBiomarkers(bioRes.data);
      } catch (err) {
        console.warn("Could not load inventory:", err.message);
      } finally {
        setInventoryLoading(false);
      }
    }
    loadInventory();
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncMsg("Synchronizing with NASA OSDR, DONKI, NTRS, RAD, and LSDA…");
    try {
      const res = await api.triggerSyncAll();
      setSyncMsg(res.message || "Sync complete!");
      await refreshState();
    } catch (err) {
      setSyncMsg(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await api.searchResearch(searchQuery);
      setSearchResults(res.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredInventory = inventory.filter((d) => {
    const matchesDomain =
      domainFilter === "ALL" ||
      d.domain.toLowerCase().includes(domainFilter.toLowerCase()) ||
      d.source.toLowerCase().includes(domainFilter.toLowerCase());
    const q = inventorySearch.toLowerCase().trim();
    const matchesQuery =
      !q ||
      d.dataset_id.toLowerCase().includes(q) ||
      d.study_title.toLowerCase().includes(q) ||
      d.domain.toLowerCase().includes(q) ||
      d.assay_or_measurement.toLowerCase().includes(q) ||
      d.ASTRA_use.toLowerCase().includes(q);
    return matchesDomain && matchesQuery;
  });

  return (
    <section className="screen active">
      <div className="row row-between mb-3">
        <div>
          <h2>NASA Data Hub &amp; Master Dataset Inventory</h2>
          <p className="muted">
            Strictly ingesting and indexing all 16 datasets from <code>ASTRA_HEALTH_NASA_Dataset_Inventory.csv</code> across OSDR, DONKI, Curiosity RAD, LSDA, and NTRS.
          </p>
        </div>
        <button onClick={handleSyncAll} className="btn" disabled={syncing}>
          {syncing ? "Syncing NASA Sources…" : "↻ Sync All NASA Sources"}
        </button>
      </div>

      {syncMsg && <div className="pill pill-ok mb-3 inline-block">{syncMsg}</div>}

      {/* 1. Master Inventory Table */}
      <div className="card mb-4">
        <div className="row row-between">
          <div>
            <h3>NASA Master Dataset Inventory ({inventory.length} Registered Datasets)</h3>
            <p className="text-xs text-gray-400">
              Source of Truth: <code>ASTRA_HEALTH_NASA_Dataset_Inventory.csv</code> · Inspiration4 Multi-Omics, Curiosity RAD, DONKI Space Weather, and NASA LSDA.
            </p>
          </div>
          <div className="actions">
            <span className="tag tag-nasa">NASA_PUBLIC</span>
          </div>
        </div>

        <div className="form-row mt-2">
          <label className="grow">
            Filter Datasets by Keyword or ID
            <input
              type="text"
              placeholder="e.g. OSD-575, Inspiration4, troponin, radiation, sleep, bone..."
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
            />
          </label>
          <label>
            Domain
            <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
              <option value="ALL">All Domains (16 Datasets)</option>
              <option value="Inspiration4">Inspiration4 Multi-Omics (10)</option>
              <option value="Radiation">Planetary Surface & Space Weather (4)</option>
              <option value="Archive">Life Sciences Archive (LSDA/NLSP) (1)</option>
              <option value="CFE">Cell Biology Flight Analog (1)</option>
            </select>
          </label>
        </div>

        {inventoryLoading ? (
          <p className="muted">Loading dataset inventory…</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Dataset ID</th>
                  <th>Source</th>
                  <th>Study Title / Scope</th>
                  <th>Domain &amp; Assay</th>
                  <th>Sample / Target</th>
                  <th>ASTRA Grounding Use</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((d) => (
                  <tr key={d.dataset_id}>
                    <td>
                      <strong>{d.dataset_id}</strong>
                    </td>
                    <td>
                      <span className="tag tag-nasa">{d.source}</span>
                    </td>
                    <td>
                      <div className="font-semibold text-sm">{d.study_title}</div>
                      <span className="text-xs text-gray-400">{d.verification_status}</span>
                    </td>
                    <td>
                      <div className="text-xs font-medium text-gray-300">{d.domain}</div>
                      <div className="text-xs text-gray-400">{d.assay_or_measurement}</div>
                    </td>
                    <td className="text-xs text-gray-300">{d.sample_type}</td>
                    <td className="text-xs text-blue-300">{d.ASTRA_use}</td>
                    <td>
                      <div className="actions">
                        {d.study_page_url && (
                          <a
                            href={d.study_page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                          >
                            Portal ↗
                          </a>
                        )}
                        <button
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => setSelectedDataset(selectedDataset?.dataset_id === d.dataset_id ? null : d)}
                        >
                          {selectedDataset?.dataset_id === d.dataset_id ? "Hide" : "Details"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected Dataset Detail Card */}
        {selectedDataset && (
          <div className="mt-3 p-3 bg-gray-900 border border-blue-500 rounded text-sm">
            <h4>Dataset Details: {selectedDataset.dataset_id}</h4>
            <div className="grid grid-2 mt-2">
              <div>
                <p><strong>Title:</strong> {selectedDataset.study_title}</p>
                <p><strong>Domain:</strong> {selectedDataset.domain}</p>
                <p><strong>Measurement / Assay:</strong> {selectedDataset.assay_or_measurement}</p>
                <p><strong>Sample Type:</strong> {selectedDataset.sample_type}</p>
                <p><strong>File Formats:</strong> {selectedDataset.file_formats}</p>
              </div>
              <div>
                <p><strong>Application in ASTRA:</strong> {selectedDataset.ASTRA_use}</p>
                <p><strong>Access Restrictions:</strong> {selectedDataset.access_restrictions}</p>
                <p><strong>Verification:</strong> {selectedDataset.verification_status}</p>
                <p><strong>Download / Listing URL:</strong> <a href={selectedDataset.download_or_file_listing_url} target="_blank" rel="noopener noreferrer">{selectedDataset.download_or_file_listing_url}</a></p>
                <p><strong>Citation / Publication:</strong> <a href={selectedDataset.citation_url} target="_blank" rel="noopener noreferrer">{selectedDataset.citation_url}</a></p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Clinical Biomarker Panels Grounding (OSD-575 / OSD-569) */}
      {biomarkers && (
        <div className="card mb-4">
          <div className="row row-between">
            <div>
              <h3>Inspiration4 Clinical Biomarker Panels (OSD-575 &amp; OSD-569)</h3>
              <p className="text-xs text-gray-400">
                Direct scientific evidence linking spaceflight physiological changes to vital signs monitoring in ASTRA HEALTH.
              </p>
            </div>
            <span className="tag tag-nasa">OSDR MULTI-OMICS</span>
          </div>

          <div className="grid grid-2 mt-3">
            {biomarkers.clinical_panels.map((p, idx) => (
              <div key={idx} className="event-item">
                <strong>{p.panel}</strong>
                <p className="text-sm text-gray-300 mt-1">{p.description}</p>
                <div className="mt-2 text-xs text-blue-300">
                  <strong>Vital Signs Correlation:</strong> {p.relation_to_vitals}
                </div>
                <div className="mt-2 text-xs">
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    Open OSDR Study Record ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Five Core Blueprint Sources Grid */}
      <div className="grid grid-2 mb-4">
        <div className="card">
          <h3>NASA OSDR (Open Science Data Repository)</h3>
          <p className="text-sm text-gray-300">
            Space biology and human research data covering bone loss, muscle atrophy, cardiovascular remodeling, and radiation biology.
          </p>
          <div className="mt-2 text-xs text-gray-400">
            API: <code>https://osdr.nasa.gov/osdr/data/search</code>
          </div>
          <div className="mt-2">
            <span className="tag tag-nasa">NASA_PUBLIC</span>
          </div>
        </div>

        <div className="card">
          <h3>NASA DONKI (Space Weather Database)</h3>
          <p className="text-sm text-gray-300">
            Real solar activity notifications: Solar Energetic Particles (SEP), Solar Flares (FLR), Coronal Mass Ejections (CME), and Geomagnetic Storms (GST).
          </p>
          <div className="mt-2 text-xs text-gray-400">
            API: <code>https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP</code>
          </div>
          <div className="mt-2">
            <span className="tag tag-nasa">NASA_PUBLIC</span>
          </div>
        </div>

        <div className="card">
          <h3>Curiosity RAD (Mars Surface Radiation)</h3>
          <p className="text-sm text-gray-300">
            Calibrated measurements on the surface of Mars inside Gale Crater (0.64 ± 0.12 mSv/day, Hassler 2014) and interplanetary cruise (1.84 ± 0.30 mSv/day, Zeitlin 2013).
          </p>
          <div className="mt-2 text-xs text-gray-400">
            Archive: <code>MSL-M-RAD-3-RDR-V1.0 (PDS PPI Node)</code>
          </div>
          <div className="mt-2">
            <span className="tag tag-nasa">NASA_PUBLIC</span>
          </div>
        </div>

        <div className="card">
          <h3>NASA LSDA &amp; NTRS</h3>
          <p className="text-sm text-gray-300">
            NASA Life Sciences Data Archive (LSDA) and NASA Technical Reports Server (NTRS) scientific publications on human microgravity countermeasures.
          </p>
          <div className="mt-2 text-xs text-gray-400">
            Portal: <code>https://ntrs.nasa.gov/api/citations/search</code>
          </div>
          <div className="mt-2">
            <span className="tag tag-nasa">NASA_PUBLIC</span>
          </div>
        </div>
      </div>

      {/* 4. Sync Status */}
      <div className="card mb-4">
        <h3>NASA Sources Sync Status</h3>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Last Synced</th>
              <th>Status</th>
              <th>Records Indexed</th>
            </tr>
          </thead>
          <tbody>
            {syncLogs.map((l) => (
              <tr key={l.id}>
                <td>{l.source}</td>
                <td>{new Date(l.last_synced_at).toLocaleString()}</td>
                <td>
                  <span className={l.status === "ok" ? "ok" : "err"}>{l.status}</span>
                </td>
                <td>{l.record_count ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Search Across All Sources */}
      <div className="card">
        <h3>Search Across All 5 NASA Sources</h3>
        <form onSubmit={handleSearch} className="form-row">
          <label className="grow">
            Search Term
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. bone mineral loss, solar flares, radiation shelter"
            />
          </label>
          <button className="btn" type="submit">
            Search NASA Records
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-3">
            {searchResults.map((r, i) => (
              <div key={i} className="research-item">
                <strong>{r.title}</strong> <span className="tag tag-nasa">NASA_PUBLIC</span>
                <br />
                <span className="muted">{r.source_name || r.source} · {r.citation || r.source_record_id}</span>
                {r.description && <p className="mt-1 text-sm text-gray-300">{r.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
