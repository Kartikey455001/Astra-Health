# NASA Datasets Integration Guide & Master Inventory

ASTRA HEALTH integrates strictly the scientific data sources specified in the NASA Space Apps Challenge blueprint and `ASTRA_HEALTH_NASA_Dataset_Inventory.csv`.

Every record carries provenance metadata (`source_name`, `source_record_id`, `data_origin: "NASA_PUBLIC"`, `observed_at`, `retrieved_at`, `source_url`, `quality_status: "validated"`).

---

## 1. NASA Master Dataset Inventory (16 Registered Datasets)

Loaded, indexed, and queryable from `ASTRA_HEALTH_NASA_Dataset_Inventory.csv`:

| Dataset ID | Source | Study Title / Scope | Domain & Assay | Sample / Platform | Application in ASTRA HEALTH |
|---|---|---|---|---|---|
| **OSD-569** | NASA OSDR | Whole blood RNA-seq and Complete Blood Count (CBC) with differential | Human spaceflight; transcriptomics & hematology | Whole blood; Illumina NovaSeq 6000 | Baseline immune response and hematological kinetics; tracks microgravity-induced hemoconcentration and SpO₂ transport. |
| **OSD-570** | NASA OSDR | PBMC single-nuclei RNA-seq immune profiling | Human spaceflight; single-cell transcriptomics | Peripheral Blood Mononuclear Cells (PBMC) | Explains immune system suppression and leukocyte transcriptional shifts in microgravity. |
| **OSD-571** | NASA OSDR | Plasma proteomics: Orbitrap mass spectrometry | Human spaceflight; circulating plasma proteome | Blood plasma; LC-MS/MS Orbitrap | Connects fluid shift, vascular tone changes, and endothelial stress response. |
| **OSD-572** | NASA OSDR | Plasma cell-free DNA (cfDNA) and mitochondrial cfDNA quantification | Human spaceflight; cell-free circulating DNA | Cell-free plasma DNA; Qubit & qPCR | Biological marker for cellular turnover and space radiation damage. |
| **OSD-573** | NASA OSDR | Skin and nares microbiome profiling (metagenomic sequencing) | Human spaceflight; cutaneous & respiratory microbiome | Skin swabs and nares swabs; Illumina | Informs microbial countermeasures and infectious risk mitigation in closed habitats. |
| **OSD-574** | NASA OSDR | Saliva cytokine profiling and viral reactivation assays | Human spaceflight; immune activation & salivary biomarkers | Passive drool saliva; Luminex multiplex | Validates stress, fatigue, and latent virus surveillance (EBV, VZV) during mission operations. |
| **OSD-575** | NASA OSDR | Blood serum metabolic, immune, and cardiac biomarker panels | Human spaceflight; clinical chemistry & serum panels | Blood serum; clinical chemistry analyzers | **Core clinical panel:** correlates resting heart-rate elevation, autonomic remodeling, troponin I, and NT-proBNP. |
| **OSD-630** | NASA OSDR | Chromosomal aberration and telomere length kinetics in Inspiration4 crew | Human spaceflight; cytogenetics & telomere biology | Whole blood & lymphocyte metaphase spreads | Grounding for long-duration deep-space radiation risk and cellular aging. |
| **OSD-656** | NASA OSDR | Urine metabolomics and calcium/creatinine excretion kinetics | Human spaceflight; urine metabolome & renal chemistry | Urine voids; Mass spectrometry | Direct grounding for bone mineral loss, hypercalciuria, and renal stone risk surveillance. |
| **OSD-687** | NASA OSDR | Physiological telemetry and sleep actigraphy during orbital mission | Human spaceflight; wearable telemetry & sleep tracking | Wearable sensors & Garmin actigraphy | Ground-truth benchmark for our behavioral health rules engine and sleep logging. |
| **MSL-M-RAD-3-RDR-V1.0** | NASA PDS PPI | Mars Science Laboratory Curiosity RAD calibrated RDR | Planetary surface radiation; Mars rover | Instrument observations inside Gale Crater | Environmental Mars surface radiation benchmark (`0.64 ± 0.12 mSv/day`). |
| **DONKI-SEP** | NASA DONKI | Solar Energetic Particle event catalog | Space weather; energetic particle flux | CCMC automated models & satellite detectors | Real-time solar storm alerts triggering mission radiation shelter procedures. |
| **DONKI-CME** | NASA DONKI | Coronal Mass Ejection space weather events | Space weather; interplanetary plasma ejection | SOHO/LASCO & STEREO coronagraphs | Coronal mass ejection tracking for interplanetary transit safety. |
| **DONKI-GST** | NASA DONKI | Geomagnetic Storm event records | Space weather; magnetospheric disturbances | NOAA Kp index & magnetometer networks | Space environment context for orbital and deep-space missions. |
| **NLSP/LSDA** | NASA LSDA | NASA Life Sciences Data Archive & Life Sciences Portal | Human, plant, and animal flight research | Archival astronaut and flight biomedical records | Grounding for sleep tracking, chronobiology, muscle atrophy, and bone loss. |
| **OSD-21 / OSD-530** | NASA OSDR | Spaceflight and flight-analog cellular transcriptomics | Space biology; rodent & cellular microgravity analogs | Skeletal muscle & bone tissue | Mechanistic research backing muscle fiber transition and osteoblast suppression. |

---

## 2. Inspiration4 Clinical Biomarker Panels (OSD-575 & OSD-569)

ASTRA HEALTH integrates the validated biomarker suites from the Inspiration4 mission publication suite (Nature Space Omics & Space Health Collection, 2024):

### Cardiovascular & Autonomic Panel (OSD-575)
- **High-Sensitivity Troponin I (hs-cTnI):** Monitors myocardial micro-strain during gravitational transition.
- **N-Terminal pro-B-type Natriuretic Peptide (NT-proBNP):** Reflects ventricular wall tension and cephalad fluid shifts.
- **Creatine Kinase-MB (CK-MB):** Skeletal vs cardiac muscle remodeling indicator.
- **Application:** Correlates with our deterministic Heart Rate deviation engine (<15% Normal, 15–30% Watch, ≥30% repeated Act).

### Comprehensive Metabolic Panel (CMP) (OSD-575)
- **Electrolytes (Na⁺, K⁺, Ca²⁺):** Tracks microgravity hemoconcentration, fluid homeostasis, and bone mineral resorption.
- **Renal Function (BUN, Creatinine):** Hydration and renal perfusion monitoring.
- **Hepatic Enzymes (ALT, AST):** Xenobiotic metabolism and physiological stress markers.

### Complete Blood Count (CBC) with Differential (OSD-569)
- **White Blood Cell Count & NLR (Neutrophil-to-Lymphocyte Ratio):** Direct markers of acute physiological stress and immune activation.
- **Hemoglobin & Hematocrit:** Tracks "spaceflight anemia" and intravascular plasma volume shifts.
- **Application:** Explains SpO₂ fluctuations and oxygen delivery kinetics under physical workload.

---

## 3. Space Weather & Planetary Radiation (Curiosity RAD & DONKI)

### Curiosity RAD (MSL-M-RAD-3-RDR-V1.0)
- **Surface Rate:** `0.64 ± 0.12 mSv/day` (Hassler et al., *Science* 2014, doi:10.1126/science.1244797).
- **Cruise Rate:** `1.84 ± 0.30 mSv/day` (Zeitlin et al., *Science* 2013, doi:10.1126/science.1235989).
- **Safety Boundary:** Real Mars surface instrument data, **never** personal astronaut dosimetry.

### NASA DONKI Space Weather
- **Real-Time Feeds:** Solar Energetic Particles (SEP), Coronal Mass Ejections (CME), Geomagnetic Storms (GST).
- **Safety Boundary:** A DONKI event is space-weather hazard context, **never** converted into a crew member's personal dose without an approved vehicle shielding model.

---

## 4. NASA LSDA & NTRS Knowledge Grounding

- **NASA LSDA:** Portals longitudinal actigraphy data, bone mineral density kinetics, and chronobiological research.
- **NASA NTRS:** Full-text technical publications powering BM25 keyword search and RAG knowledge retrieval for the AI Health Assistant.
- **Strict Evidence Standard:** Citations link to NASA Technical Reports (e.g. NASA/TP-2019-220042) and verified peer-reviewed publications.
