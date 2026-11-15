/**
 * NASA Curiosity RAD Client (Radiation Assessment Detector — MSL)
 * Scientific research data from Mars surface and cruise phase.
 *
 * SAFETY RULE: This is Mars surface instrument data, NOT personal astronaut telemetry
 * or a direct measurement of an astronaut's exposure.
 */

const RAD_METADATA = {
  source_name: "Curiosity RAD (MSL) — PDS Archive",
  instrument: "Radiation Assessment Detector (RAD)",
  spacecraft: "Mars Science Laboratory (Curiosity)",
  dataset_id: "MSL-M-RAD-3-RDR-V1.0",
  pds_archive_url: "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/",
  index_tab_url: "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/INDEX/INDEX.TAB",
  node: "Planetary Data System (PDS) Planetary Plasma Interactions (PPI) Node",
  safety_rule: "Mars surface instrument data, not personal astronaut telemetry or a direct measurement of crew exposure.",
  published_measurements: [
    {
      environment: "Mars Surface (Gale Crater)",
      dose_rate: "0.64 ± 0.12 mSv/day",
      dose_val: 0.64,
      dose_err: 0.12,
      unit: "mSv/day",
      instrument_mode: "Surface science operations",
      citation: "Hassler et al., Science 2014 — Mars' Surface Radiation Environment Measured with the Mars Science Laboratory's Curiosity Rover",
      doi: "10.1126/science.1244797",
      source_url: "https://www.science.org/doi/10.1126/science.1244797",
      operational_implication: "A 500-day Mars surface stay would accumulate ~320 mSv, approximately 30-50% of an astronaut's career limit under current NASA guidelines."
    },
    {
      environment: "Transit Cruise Phase (Earth to Mars)",
      dose_rate: "1.84 ± 0.30 mSv/day",
      dose_val: 1.84,
      dose_err: 0.30,
      unit: "mSv/day",
      instrument_mode: "En route deep space interplanetary cruise",
      citation: "Zeitlin et al., Science 2013 — Measurements of Energetic Particle Radiation in Transit to Mars on the Mars Science Laboratory",
      doi: "10.1126/science.1235989",
      source_url: "https://www.science.org/doi/10.1126/science.1235989",
      operational_implication: "A 180-day transit each way contributes ~330 mSv in interplanetary space without solar storm events."
    }
  ],
  protective_actions: [
    "Review storm shelter procedures within mission water/fuel bulkhead configurations.",
    "Orient spacecraft shielding toward solar particle arrival direction during active SEP.",
    "Coordinate with Mission Control (SRAG) for real-time dosimetric assessment before EVAs."
  ]
};

function getRadResearchContext() {
  return {
    ...RAD_METADATA,
    retrieved_at: new Date().toISOString(),
    data_origin: "NASA_PUBLIC"
  };
}

module.exports = {
  RAD_METADATA,
  getRadResearchContext
};

