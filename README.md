# ASTRA HEALTH — NASA Space Apps Challenge 2026

**Challenge:** Create Health Monitoring Software for Astronauts  
**Team:** Innovators_X  
**Motto:** OBSERVE • ANALYZE • PREDICT • ASSIST  

---

## Overview

ASTRA HEALTH is an offline-first, dual-tier decision-support platform engineered specifically for exploration spaceflight (Orion, Artemis, and Mars missions).

The system strictly ingests, indexes, and utilizes all 16 datasets from **`ASTRA_HEALTH_NASA_Dataset_Inventory.csv`** covering spaceflight multi-omics, planetary surface radiation, solar space weather, and archival life sciences data. It pairs real-time crew telemetry with personal pre-flight baselines using a deterministic rules engine, and grounds all AI assistance in verified factual evidence without ever hallucinating clinical diagnoses or inventing medical causes.

The visual design, color palette, and layout of the frontend have been strictly preserved, while transforming all underlying features into an end-to-end operational architecture.

---

## Project Structure

```
astra-health/
│
├── frontend/                  # React + Vite (PWA + Recharts + Tailwind CSS)
│   ├── src/
│   │   ├── components/        # Sidebar, TopBar, HonestyBanner, Sparkline, Charts
│   │   ├── pages/             # 6 Mission Screens + NASA Master Data Hub
│   │   ├── services/          # REST API & WebSocket/SSE clients
│   │   ├── store/             # React Context store with IndexedDB sync
│   │   ├── hooks/             # Custom React hooks (useAstra, etc.)
│   │   └── utils/             # Deterministic rules engine (offline client-side)
│   └── public/                # PWA manifest.webmanifest & Service Worker (sw.js)
│
├── backend/                   # Node.js REST API + Real-Time Streaming Server
│   ├── src/
│   │   ├── routes/            # 30 REST endpoints (vitals, baselines, alerts, inventory, etc.)
│   │   ├── controllers/       # Controller business logic & provenance tracking
│   │   ├── services/          # StoreService (12 tables matching blueprint §7)
│   │   ├── nasa/              # Ingestion clients & RFC 4180 CSV inventory parser
│   │   ├── engines/           # Deterministic health alert engine
│   │   └── middleware/        # Input validation, CORS, error handling
│   ├── data/                  # astra-database.json (Persistent store)
│   ├── prisma/                # Prisma schema (12 tables per blueprint §7)
│   └── tests/                 # Automated backend integration & e2e API tests
│
├── ai-service/                # Python + FastAPI Decision Support Microservice
│   ├── datasets/              # All 16 inventory datasets + curated research JSON
│   ├── preprocessing/         # Text tokenizer & BM25 scoring
│   ├── models/                # Pydantic schemas for queries, citations & explanations
│   ├── rag/                   # RAG knowledge retriever & non-diagnostic reasoning
│   └── main.py                # FastAPI endpoints (/health, /api/ai/explain, /api/ai/query)
│
├── docs/                      # Technical Documentation
│   ├── architecture.md        # Architecture, provenance rules, engine specs
│   ├── api-specification.md   # Complete REST API & SSE events
│   ├── nasa-datasets.md       # In-depth guide to all 16 datasets & biomarker panels
│   └── verification-and-testing.md # Test matrices & defect resolution records
│
├── tests/                     # Deterministic rules & checklist tests
├── docker-compose.yml         # Multi-container orchestration (Frontend, Backend, AI, Postgres)
├── ASTRA_HEALTH_NASA_Dataset_Inventory.csv # Master 16-dataset inventory source of truth
├── index.html                 # Zero-build frontend (native HTML/JS/CSS fallback)
├── styles.css                 # Mission command dark theme
├── server.js                  # Single-command server
└── README.md
```

---

## NASA Master Dataset Inventory (Strictly Compliant)

All 16 datasets from `ASTRA_HEALTH_NASA_Dataset_Inventory.csv` are indexed and accessible via REST (`/api/nasa/inventory`) and Python RAG:

| Dataset ID | Source | Study Title / Scope | Domain & Assay | ASTRA Grounding Use |
|---|---|---|---|---|
| **OSD-569** | NASA OSDR | Whole blood RNA-seq and Complete Blood Count (CBC) with differential | Transcriptomics & hematology | Baseline immune response and hematological kinetics; tracks SpO₂ transport. |
| **OSD-570** | NASA OSDR | PBMC single-nuclei RNA-seq immune profiling | Single-cell transcriptomics | Explains immune system suppression and leukocyte transcriptional shifts. |
| **OSD-571** | NASA OSDR | Plasma proteomics: Orbitrap mass spectrometry | Circulating plasma proteome | Connects fluid shift, vascular tone changes, and endothelial stress response. |
| **OSD-572** | NASA OSDR | Plasma cell-free DNA (cfDNA) and mitochondrial cfDNA quantification | Cell-free circulating DNA | Biological marker for cellular turnover and space radiation damage. |
| **OSD-573** | NASA OSDR | Skin and nares microbiome profiling (metagenomic sequencing) | Cutaneous & respiratory microbiome | Informs microbial countermeasures and infectious risk mitigation. |
| **OSD-574** | NASA OSDR | Saliva cytokine profiling and viral reactivation assays | Immune activation & salivary biomarkers | Validates stress, fatigue, and latent virus surveillance (EBV, VZV). |
| **OSD-575** | NASA OSDR | Blood serum metabolic, immune, and cardiac biomarker panels | Clinical chemistry & serum panels | **Core clinical panel:** correlates heart-rate elevation, troponin I, and NT-proBNP. |
| **OSD-630** | NASA OSDR | Chromosomal aberration and telomere length kinetics in Inspiration4 crew | Cytogenetics & telomere biology | Grounding for long-duration deep-space radiation risk and cellular aging. |
| **OSD-656** | NASA OSDR | Urine metabolomics and calcium/creatinine excretion kinetics | Urine metabolome & renal chemistry | Direct grounding for bone mineral loss, hypercalciuria, and renal stone risk. |
| **OSD-687** | NASA OSDR | Physiological telemetry and sleep actigraphy during orbital mission | Wearable telemetry & sleep tracking | Ground-truth benchmark for behavioral health rules engine and sleep logging. |
| **MSL-M-RAD-3-RDR-V1.0** | NASA PDS PPI | Mars Science Laboratory Curiosity RAD calibrated RDR | Planetary surface radiation; Mars rover | Environmental Mars surface radiation benchmark (`0.64 ± 0.12 mSv/day`). |
| **DONKI-SEP** | NASA DONKI | Solar Energetic Particle event catalog | Space weather; energetic particle flux | Real-time solar storm alerts triggering mission radiation shelter procedures. |
| **DONKI-CME** | NASA DONKI | Coronal Mass Ejection space weather events | Space weather; interplanetary plasma ejection | Coronal mass ejection tracking for interplanetary transit safety. |
| **DONKI-GST** | NASA DONKI | Geomagnetic Storm event records | Space weather; magnetospheric disturbances | Space environment context for orbital and deep-space missions. |
| **NLSP/LSDA** | NASA LSDA | NASA Life Sciences Data Archive & Life Sciences Portal | Human, plant, and animal flight research | Grounding for sleep tracking, chronobiology, muscle atrophy, and bone loss. |
| **OSD-21 / OSD-530** | NASA OSDR | Spaceflight and flight-analog cellular transcriptomics | Space biology; rodent microgravity analogs | Mechanistic research backing muscle fiber transition and osteoblast suppression. |

> **Safety Rules:**
> - A DONKI event is space weather context, **never** an astronaut's personal absorbed dose.
> - Curiosity RAD values are Mars surface instrument data, **not** astronaut telemetry.
> - Every record carries `data_origin` (`NASA_PUBLIC`, `SIMULATED`, `MANUAL`, `DEVICE`).

---

## Health Analysis Engine

### Personal Baseline Comparison
Comparisons are made against individual baselines established during pre-flight reference periods:

```
Crew Member A (Commander)
Baseline: 68 BPM  |  Latest: 94 BPM (+38.2%)  |  Class: ACT (Confirmed Repeat)
Explanation: Heart rate has increased compared with personal baseline across consecutive readings. Follow approved onboard medical protocol.
```

### Alert Classification Tiers:
- **NORMAL**: Deviation < 15% from personal baseline.
- **WATCH**: 15% to 30% deviation, single unconfirmed spike >= 30% (`DEVIATION_ACT_SINGLE` / `RECHECK`), stale reading (>120 min), or short sleep pattern (<6h for 2+ nights).
- **ACT**: Deviation >= 30% repeated across consecutive readings (`DEVIATION_ACT_REPEATED`).

---

## AI Everywhere (Gemini 3.8 Flash + NASA RAG)

AI decision support is available across every screen in the platform:
- **Mission Command Dashboard**: Free-form medical query input (`dashAskInput`) and question chips.
- **Physiological Monitoring**: `✦ AI Analyze Vital Trends` synthesizing vitals with Inspiration4 `OSD-575` / `OSD-569` clinical panels.
- **Radiation Command Center**: `✦ AI Evaluate Radiation Situation` translating NASA DONKI events and Curiosity RAD benchmarks into operational shelter advisories.
- **Behavioral Health**: `✦ AI Evaluate Circadian & Fatigue Pattern` evaluating sleep deficits against NASA LSDA norms.
- **AI Health Assistant**: Free-form natural language query, NASA research search, and model selection (`gemini-3.8-flash` active).
- **Reports & Research**: `✦ AI Executive Medical Briefing` compiling action-oriented daily summaries.

When asked *"Why is my heart rate increasing?"*, the system answers using the 6 prompt criteria:
1. **Recent heart rate readings**
2. **Personal baseline**
3. **Exercise history (T2 treadmill, CEVIS, ARED)**
4. **Sleep and fatigue information**
5. **Relevant symptoms / reason codes**
6. **Verified spaceflight medical knowledge & NASA research citations**

All numbers in AI text are mathematically verified against underlying telemetry records before display.

---

## Third-Party Credentials & Configuration

ASTRA HEALTH is configured with your Gemini 3.8 Flash API key and runs **100% functional out of the box**:

| Environment Variable | Description | Active Default / Fallback |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | Configured via environment variable (`process.env.GEMINI_API_KEY`) |
| `GEMINI_MODEL` | Gemini Model selection | `gemini-3.8-flash` (auto-fallback: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash`) |
| `NASA_API_KEY` | NASA Open API key for DONKI | `DEMO_KEY` (functional with 30 req/hr; add your key from `api.nasa.gov` for 1,000 req/hr) |
| `PORT` | Node.js backend port | `8080` |
| `AI_SERVICE_URL` | URL to Python FastAPI microservice | `http://localhost:8000` |
| `DATABASE_URL` | Optional PostgreSQL connection string | File-backed JSON store in `backend/data/astra-database.json` |

---

## Running the Application

### Option A: Local Run (Recommended)

1. **Backend Server (Node.js)**:
   ```bash
   node server.js
   # Running on http://localhost:8080
   # Serves all 30 REST endpoints, SSE streams, and static frontend
   ```

2. **AI Microservice (Python + FastAPI)**:
   ```bash
   cd ai-service
   uvicorn main:app --port 8000
   # Running on http://localhost:8000
   ```

3. **Frontend**:
   - **Zero-Build Fallback**: Open `http://localhost:8080/index.html` in your browser.
   - **React + Vite Frontend**:
     ```bash
     cd frontend
     npm install --legacy-peer-deps
     npm run dev
     # Running on http://localhost:3000
     ```

### Option B: Docker (All-in-One)

```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- AI Microservice: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## Automated Test Results

**105 Total Assertions Passed, 0 Failed** across 5 test suites:

```bash
node --test tests/*.test.js backend/tests/*.test.js
```

- **E2E REST API & Inventory Suite** (20/20 PASS): Validates all 30 endpoints, parameter parsing, vital entry, simulate tick, and inventory accessions.
- **Engine Boundary Tests TC-01…TC-12** (11/11 PASS): Tests percentage deviations, single spike vs repeated confirmation, SpO₂ drops, stale flags.
- **Checklist Engine Tests** (15/15 PASS): Division by zero protection, missing value flags, poor-quality estimation tags.
- **NASA Dataset Inventory Integration** (9/9 PASS): Loads all 16 datasets from the CSV, Inspiration4 omics suite, Curiosity RAD, and DONKI.
- **Fact Grounding & Safety Suite** (3/3 PASS): 6-factor explanation compliance, crew member isolation, and personal dose disclaimers.
