# ASTRA HEALTH — API Specification

The backend provides a RESTful interface and WebSocket/SSE real-time streaming server.

## Base URL
- Local: `http://localhost:8080/api`
- Docker: `http://backend:8080/api`

---

## Endpoints Overview

### 1. System & State
- `GET /api/health` — Service health, framework, active alerts count, and crew count.
- `GET /api/state` — Full mission state snapshot.
- `POST /api/state/reset` — Resets state to Day-142 synthetic mission baseline.
- `GET /api/events` — Server-Sent Events (SSE) live telemetry stream.

### 2. Astronauts & Baselines
- `GET /api/astronauts` — List all crew members with evaluated severity status and heart-rate telemetry.
- `GET /api/astronauts/:id` — Get detailed physiological and behavioral evaluation for an astronaut.
- `GET /api/baselines?astronaut_id=:id` — Get individual baselines.
- `PUT /api/baselines` — Set or update baseline value for a metric.

### 3. Vitals & Simulation
- `GET /api/vitals?astronaut_id=:id&metric=:m&limit=:n` — Query vital history.
- `POST /api/vitals` — Submit manual vital measurement.
  ```json
  {
    "astronaut_id": "ast-1",
    "metric": "heart_rate",
    "value": 72.5,
    "quality_status": "validated",
    "data_origin": "MANUAL"
  }
  ```
- `POST /api/vitals/simulate-tick` — Advance simulation tick across all crew members.

### 4. Behavioral Health
- `POST /api/behavioral/sleep` — Submit sleep log.
  ```json
  { "astronaut_id": "ast-1", "duration_hours": 7.2, "quality": "good" }
  ```
- `POST /api/behavioral/mood` — Submit mood/stress/fatigue log (1-10 scales).
- `POST /api/behavioral/exercise` — Submit exercise log (activity, duration, intensity).
- `GET /api/behavioral/:astronautId` — Behavioral trend analysis.

### 5. Radiation & NASA Data
- `GET /api/radiation/donki?type=SEP` — Retrieve NASA DONKI events.
- `GET /api/radiation/rad` — Curiosity RAD Mars surface measurements & citations.
- `GET /api/radiation/lsda` — NASA LSDA research topics and catalogue.
- `GET /api/nasa/osdr?term=bone+loss` — Search NASA OSDR repository.
- `POST /api/nasa/ntrs` — Search NASA Technical Reports Server.
- `GET /api/nasa/research?q=:query` — Multi-source semantic search across OSDR + NTRS.
- `GET /api/nasa/sync-status` — Retrieve sync logs and provenance status.
- `POST /api/nasa/sync-all` — Trigger full sync across all 5 NASA data sources.

### 6. AI Decision Support
- `POST /api/assistant/explain` — Explains health status, vitals, or trends.
  ```json
  {
    "astronaut_id": "ast-1",
    "kind": "hr",
    "query": "Why is my heart rate increasing?"
  }
  ```

### 7. Reports
- `GET /api/reports/daily?astronaut_id=:id` — Formatted daily mission health report.

