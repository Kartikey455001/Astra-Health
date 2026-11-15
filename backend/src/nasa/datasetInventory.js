/**
 * ASTRA HEALTH — NASA Dataset Inventory Manager
 * Strictly loads, parses, indexes, and serves all datasets from:
 * ASTRA_HEALTH_NASA_Dataset_Inventory.csv
 *
 * Includes:
 * - Inspiration4 Human Spaceflight Omics (OSD-569 through OSD-575, OSD-630, OSD-656, OSD-687)
 * - Curiosity RAD Calibrated RDR (MSL-M-RAD-3-RDR-V1.0)
 * - NASA DONKI Space Weather Events (DONKI-SEP, DONKI-CME, DONKI-GST)
 * - NASA NLSP/LSDA Life Sciences Portal (Sleep, Actiwatch, Chronobiology, Bone)
 * - RR1/JAXA CFE spaceflight biology omics (OSD-21, OSD-99, OSD-101, OSD-103, OSD-104, OSD-105, OSD-530)
 */

const fs = require("node:fs");
const path = require("node:path");

function findCsvFile() {
  const candidates = [
    path.resolve(__dirname, "../../../ASTRA_HEALTH_NASA_Dataset_Inventory.csv"),
    path.resolve(__dirname, "../../ASTRA_HEALTH_NASA_Dataset_Inventory.csv"),
    path.resolve(__dirname, "../ASTRA_HEALTH_NASA_Dataset_Inventory.csv"),
    path.resolve(process.cwd(), "ASTRA_HEALTH_NASA_Dataset_Inventory.csv"),
    path.resolve(process.cwd(), "backend/ASTRA_HEALTH_NASA_Dataset_Inventory.csv"),
    path.resolve(__dirname, "../../data/ASTRA_HEALTH_NASA_Dataset_Inventory.csv")
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const CSV_FILE = findCsvFile();

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx] : "";
    });
    rows.push(obj);
  }
  return rows;
}

class DatasetInventoryManager {
  constructor() {
    this.datasets = [];
    this.indexedById = new Map();
    this.getAllDatasets = this.getAllDatasets.bind(this);
    this.getDatasetById = this.getDatasetById.bind(this);
    this.searchDatasets = this.searchDatasets.bind(this);
    this.getDatasetsByDomain = this.getDatasetsByDomain.bind(this);
    this.getDatasetsBySource = this.getDatasetsBySource.bind(this);
    this.getBiomarkerContext = this.getBiomarkerContext.bind(this);
    this.getRadiationInventoryContext = this.getRadiationInventoryContext.bind(this);
    this.getBehavioralInventoryContext = this.getBehavioralInventoryContext.bind(this);
    this.loadInventory();
  }

  loadInventory() {
    try {
      if (!fs.existsSync(CSV_FILE)) {
        console.warn("Dataset inventory CSV not found at:", CSV_FILE);
        return;
      }
      const raw = fs.readFileSync(CSV_FILE, "utf8");
      this.datasets = parseCSV(raw);
      this.indexedById.clear();

      this.datasets.forEach((item) => {
        const rawId = item.dataset_id.toUpperCase();
        // Index by primary dataset_id
        this.indexedById.set(rawId, item);

        // If dataset_id has parentheses (e.g. NLSP/LSDA (archive; no single study accession)), index clean prefix
        if (rawId.includes("(")) {
          const prefix = rawId.split("(")[0].trim();
          if (prefix) this.indexedById.set(prefix, item);
        }

        // Also split if multiple accessions are listed (e.g. OSD-21; OSD-99; ...)
        if (rawId.includes(";")) {
          rawId.split(";").forEach((part) => {
            const clean = part.trim().toUpperCase();
            if (clean) this.indexedById.set(clean, item);
          });
        }
      });

      console.log(`NASA Dataset Inventory loaded: ${this.datasets.length} master datasets registered.`);
    } catch (err) {
      console.error("Failed to parse ASTRA_HEALTH_NASA_Dataset_Inventory.csv:", err.message);
    }
  }

  getInventorySummary() {
    const sources = {};
    this.datasets.forEach((d) => {
      const s = d.source || "Other";
      sources[s] = (sources[s] || 0) + 1;
    });
    return {
      total_datasets: this.datasets.length,
      sources,
      domains: [...new Set(this.datasets.map((d) => d.domain))]
    };
  }

  getAllDatasets() {
    return this.datasets;
  }

  getDatasetById(id) {
    if (!id) return null;
    return this.indexedById.get(id.toUpperCase().trim()) || null;
  }

  searchDatasets(query) {
    if (!query) return this.datasets;
    const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (tokens.length === 0) return this.datasets;
    return this.datasets.filter((d) => {
      const fullText = `${d.dataset_id} ${d.study_title} ${d.domain} ${d.assay_or_measurement} ${d.sample_type} ${d.ASTRA_use} ${d.source}`.toLowerCase();
      return tokens.some(t => fullText.includes(t));
    }).sort((a, b) => {
      const textA = `${a.dataset_id} ${a.study_title} ${a.domain} ${a.assay_or_measurement} ${a.sample_type} ${a.ASTRA_use} ${a.source}`.toLowerCase();
      const textB = `${b.dataset_id} ${b.study_title} ${b.domain} ${b.assay_or_measurement} ${b.sample_type} ${b.ASTRA_use} ${b.source}`.toLowerCase();
      const scoreA = tokens.reduce((acc, t) => acc + (textA.includes(t) ? 1 : 0), 0);
      const scoreB = tokens.reduce((acc, t) => acc + (textB.includes(t) ? 1 : 0), 0);
      return scoreB - scoreA;
    });
  }

  getDatasetsByDomain(domain) {
    if (!domain) return [];
    const dom = domain.toLowerCase();
    return this.datasets.filter((d) => d.domain.toLowerCase().includes(dom));
  }

  getDatasetsBySource(source) {
    if (!source) return [];
    const src = source.toLowerCase();
    return this.datasets.filter((d) => d.source.toLowerCase().includes(src));
  }

  /**
   * Specific clinical biomarker reference mappings derived from:
   * OSD-575 (Inspiration4 blood serum metabolic and immune/cardiac biomarker panels)
   * OSD-569 (Inspiration4 whole blood CBC & clonal hematopoiesis)
   * OSD-571 (Inspiration4 plasma proteomics & metabolomics)
   */
  getClinicalBiomarkerContext() {
    const ctx = this.getBiomarkerContext();
    return {
      study_accession: "OSD-575 / OSD-569",
      ...ctx
    };
  }

  getBiomarkerContext() {
    return {
      source_dataset: "OSD-575 / OSD-569 / OSD-571",
      study_title: "Inspiration4 blood serum metabolic, immune, and cardiac biomarker panels",
      domain: "Human spaceflight; serum & whole blood biomarkers",
      sample_type: "Blood serum, plasma, and whole blood",
      clinical_panels: [
        {
          panel: "Cardiac Biomarkers (OSD-575)",
          description: "Assessment of troponin I/T, NT-proBNP, and creatine kinase-MB during gravitational transition.",
          relation_to_vitals: "Correlates directly with resting heart-rate elevation, autonomic remodeling, and cephalad fluid shift.",
          data_status: "Verified in Inspiration4 mission publication suite",
          url: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575"
        },
        {
          panel: "Comprehensive Metabolic Panel (CMP) (OSD-575)",
          description: "Electrolyte homeostasis (sodium, potassium, calcium), kidney function (BUN, creatinine), liver enzymes (ALT, AST), and fasting glucose.",
          relation_to_vitals: "Monitors hydration status, microgravity hemoconcentration, and cellular metabolic recovery.",
          data_status: "Verified in Inspiration4 mission publication suite",
          url: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575"
        },
        {
          panel: "Complete Blood Count (CBC) with Differential (OSD-569)",
          description: "White blood cell counts, neutrophil-to-lymphocyte ratio (NLR), hemoglobin, hematocrit, and platelet counts.",
          relation_to_vitals: "Tracks immune activation, oxygen carrying capacity (SpO2 correlation), and spaceflight-associated anemia.",
          data_status: "Verified in Inspiration4 mission publication suite",
          url: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-569"
        },
        {
          panel: "Immune / Cytokine Biomarker Panel (OSD-575 & OSD-570)",
          description: "Circulating cytokines (IL-6, TNF-alpha, IFN-gamma, IL-1beta) and PBMC single-nuclei RNA-seq expression profiles.",
          relation_to_vitals: "Evaluates systemic inflammatory response and physiological stress adaptation.",
          data_status: "Verified in Inspiration4 mission publication suite",
          url: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575"
        }
      ]
    };
  }

  /**
   * Radiation environment context integrating:
   * MSL-M-RAD-3-RDR-V1.0, DONKI-SEP, DONKI-CME, DONKI-GST
   */
  getRadiationInventoryContext() {
    const radDoc = this.getDatasetById("MSL-M-RAD-3-RDR-V1.0");
    const sepDoc = this.getDatasetById("DONKI-SEP");
    const cmeDoc = this.getDatasetById("DONKI-CME");
    const gstDoc = this.getDatasetById("DONKI-GST");

    const operational_rule = "A DONKI event is space-weather environmental context, never an individual astronaut's personal dose without an instrumented physical dosimeter or transport code. In the event of an elevated SEP/CME, crew should consult mission flight rules and move to the designated storm shelter.";

    return {
      operational_rule,
      curiosity_rad: {
        dataset_id: radDoc?.dataset_id || "MSL-M-RAD-3-RDR-V1.0",
        study_title: radDoc?.study_title || "Mars Science Laboratory RAD calibrated RDR",
        domain: radDoc?.domain || "Radiation environment; Mars rover",
        published_benchmarks: {
          surface_gale_crater: "0.64 ± 0.12 mSv/day (Hassler et al., Science 2014)",
          transit_cruise: "1.84 ± 0.30 mSv/day (Zeitlin et al., Science 2013)"
        }
      },
      mars_surface_calibrated_rdr: {
        dataset_id: radDoc?.dataset_id || "MSL-M-RAD-3-RDR-V1.0",
        study_title: radDoc?.study_title || "Mars Science Laboratory RAD calibrated RDR",
        domain: radDoc?.domain || "Radiation environment; Mars rover",
        format: radDoc?.file_formats || "ASCII data plus detached ASCII PDS label",
        archive_url: radDoc?.download_or_file_listing_url || "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/",
        published_measurements: [
          { environment: "Mars Surface (Gale Crater)", rate: "0.64 ± 0.12 mSv/day", citation: "Hassler et al., Science 2014" },
          { environment: "Transit Cruise Phase (Earth to Mars)", rate: "1.84 ± 0.30 mSv/day", citation: "Zeitlin et al., Science 2013" }
        ],
        safety_notice: radDoc?.ASTRA_use || "Environmental radiation context only; not astronaut personal dosimetry"
      },
      space_weather_donki: {
        sep: {
          id: sepDoc?.dataset_id || "DONKI-SEP",
          title: sepDoc?.study_title || "Solar Energetic Particle event records",
          api_url: sepDoc?.download_or_file_listing_url,
          safety_rule: "Space-weather hazard context; not crew dose"
        },
        cme: {
          id: cmeDoc?.dataset_id || "DONKI-CME",
          title: cmeDoc?.study_title || "Coronal Mass Ejection event records",
          api_url: cmeDoc?.download_or_file_listing_url
        },
        gst: {
          id: gstDoc?.dataset_id || "DONKI-GST",
          title: gstDoc?.study_title || "Geomagnetic Storm event records",
          api_url: gstDoc?.download_or_file_listing_url
        }
      }
    };
  }

  /**
   * Behavioral & Sleep research context integrating:
   * NASA NLSP/LSDA (Actiwatch, chronobiology, bone, physiology)
   */
  getBehavioralInventoryContext() {
    const lsdaDoc = this.getDatasetById("NLSP/LSDA");
    return {
      dataset_id: lsdaDoc?.dataset_id || "NLSP/LSDA",
      study_title: lsdaDoc?.study_title || "NASA Life Sciences Data Archive / Life Sciences Portal",
      domain: lsdaDoc?.domain || "Human, plant and animal flight and flight-analog research",
      portal_url: lsdaDoc?.download_or_file_listing_url || "https://nlsp.nasa.gov/explore/lsdahome",
      key_areas: [
        {
          topic: "Actiwatch Sleep & Circadian Tracking",
          details: "Longitudinal actigraphy records tracking crew sleep duration, wake episodes, sleep fragmentation, and lighting countermeasures.",
          application_in_astra: "Directly grounds our behavioral health rules engine (flags short sleep < 6h on 2+ nights)."
        },
        {
          topic: "Chronobiology & Circadian Misalignment",
          details: "Biomarker shifts (melatonin, cortisol) resulting from 90-minute orbital light/dark cycles.",
          application_in_astra: "Informs workload scheduling recommendations when fatigue scores reach 7/10 or higher."
        },
        {
          topic: "Bone & Calcium Homeostasis",
          details: "Longitudinal bone mineral density kinetics and urinary calcium excretion in microgravity.",
          application_in_astra: "Validates exercise protocol adherence (ARED resistance and T2 treadmill)."
        }
      ]
    };
  }
}

const inventoryInstance = new DatasetInventoryManager();
module.exports = inventoryInstance;
