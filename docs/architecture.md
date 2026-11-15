# ASTRA HEALTH — System Architecture & Design Specification

**Challenge:** Create Health Monitoring Software for Astronauts  
**Team:** Innovators_X  
**Philosophy:** OBSERVE • ANALYZE • PREDICT • ASSIST  

---

## 1. Executive Summary

ASTRA HEALTH is an offline-first, dual-tier decision-support platform engineered specifically for exploration spaceflight (Orion, Artemis, and Mars transit missions).

The system integrates strictly five NASA scientific datasets to establish biological context, pairs real-time crew telemetry with personal pre-flight baselines using a deterministic rules engine, and grounds all AI assistance in verified factual evidence without ever hallucinating clinical diagnoses or inventing medical causes.

```
+-----------------------------------------------------------------------------------+
|                               NASA DATA SOURCES                                   |
|   NASA OSDR    •    NASA DONKI    •    Curiosity RAD    •    LSDA    •    NTRS    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                              DATA INGESTION LAYER                                 |
|      API Clients  •  Scheduled Sync  •  Validation  •  Provenance Tagging         |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                           NORMALIZATION & STORAGE                                 |
| PostgreSQL / SQLite  •  Source Metadata  •  Timestamps  •  Quality  •  Units      |
+-----------------------------------------------------------------------------------+
                 │                                                   │
                 ▼                                                   ▼
+----------------------------------+               +--------------------------------+
|       HEALTH RULES ENGINE        |               |        AI RAG SERVICE          |
|  Deterministic • Isolated Base   |               |  Grounded Citations • Gemini   |
|  NORMAL / WATCH / RECHECK / ACT  |               |  Non-Diagnostic Decision Sup.  |
+----------------------------------+               +--------------------------------+
                 │                                                   │
                 └─────────────────────────┬─────────────────────────┘
                                           ▼
+-----------------------------------------------------------------------------------+
|                            ASTRA MISSION CONTROL UI                               |
|   Crew Monitoring  •  Vitals Charts  •  Radiation  •  Behavioral  •  Assistant    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Provenance & Data Engineering Rule

Every measurement and research record in the ASTRA system carries explicit provenance attributes:

```json
{
  "source_name": "NASA OSDR",
  "source_record_id": "OSD-661",
  "data_origin": "NASA_PUBLIC",
  "observed_at": "2026-11-13T12:00:00Z",
  "retrieved_at": "2026-11-13T16:30:00Z",
  "quality_status": "validated",
  "source_url": "https://osdr.nasa.gov/bio/repo/search?q=OSD-661"
}
```

### Data Origin Categories:
1. `NASA_PUBLIC`: Peer-reviewed scientific data from official NASA portals.
2. `SIMULATED`: Generated telemetry for mission rehearsal and testing.
3. `MANUAL`: Self-reported entries by astronauts or flight surgeons.
4. `DEVICE`: Direct sensor telemetry from active flight hardware.

---

## 3. Deterministic Health Alert Engine

Unlike generic black-box dashboards, ASTRA detects physiological deviations through personal baseline comparisons rather than population averages.

### Workflow Severity Tiers:
- **NORMAL**: Deviation < 15% from personal baseline. Action: Continue monitoring.
- **WATCH**: 15% to 30% deviation, single unconfirmed spike >= 30% (`DEVIATION_ACT_SINGLE` / `RECHECK`), stale reading (>120m), or persistent short sleep (<6h for 2+ nights). Action: Recheck measurement, review recent exercise and sleep context.
- **ACT**: Deviation >= 30% confirmed across consecutive readings (`DEVIATION_ACT_REPEATED`). Action: Follow approved onboard medical protocol and alert flight surgeon.

### Directional Awareness:
- **Rise is concerning**: Heart rate, systolic blood pressure, body temperature, respiratory rate.
- **Drop is concerning**: Oxygen saturation (SpO2).

---

## 4. AI Decision-Support Architecture

When an astronaut asks: *"Why is my heart rate increasing?"*, the system synthesizes:
1. **Recent heart rate readings**
2. **Personal baseline comparison**
3. **Exercise history (T2 treadmill, CEVIS cycle, ARED)**
4. **Sleep and fatigue context**
5. **Deterministic engine reason codes**
6. **Verified spaceflight medical knowledge and NASA OSDR/NTRS citations**

**Safety Rule:** The assistant **explains** deterministic facts. It **never diagnoses** a clinical condition or invents a cause. All numerical figures in AI output are verified against underlying telemetry records before display.

