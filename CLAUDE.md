# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MIT Hackathon (Challenge 03) — **Indian Healthcare Reasoning Auditor**. A multi-agent reasoning system that audits Indian medical facility records, scores capability claims with calibrated confidence, and maps medical deserts.

**Team split**: Person A owns the Truth Layer (`src/shared/`, fixtures, Gold tables). Person B owns the Reasoning Layer (`src/reasoning/`, `src/api/`). This repo is Person B's lane.

## Backend Commands

```bash
# Setup
python -m venv .venv
source .venv/Scripts/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cp .env.example .env

# Run API server
uvicorn src.api.server:app --reload --port 8000

# Tests
pytest                                 # all tests
pytest tests/reasoning/                # reasoning agents only
pytest tests/api/                      # API endpoints only
pytest tests/reasoning/test_pipeline.py  # single file

# Lint / type-check
ruff check src/
mypy src/shared/                       # mypy scope is shared/ only

# Demo smoke test (writes outputs/hour8_smoke.json)
python -m src.reasoning.demo
```

## Frontend Commands

```bash
cd web
npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint
npm run typecheck
npm test           # Vitest
```

> **Warning**: This project uses Next.js 15 + React 19, which have breaking changes from prior versions. Before writing any Next.js code, read the relevant guide in `web/node_modules/next/dist/docs/`.

## Key Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `HACKATHON_MODE` | `mock` | `mock` = JSON fixtures; `real` = Databricks |
| `MLFLOW_TRACKING_URI` | `./mlruns` | Local MLflow store |
| `MLFLOW_EXPERIMENT_NAME` | `hacknation-reasoning` | Experiment name |
| `DATABRICKS_HOST` / `DATABRICKS_TOKEN` | (empty) | Required for `HACKATHON_MODE=real` |

## Architecture

### Agent Pipeline

```
QueryRequest
  → Coordinator     (intent extraction + regex-based routing)
  → GeoReasoner     (haversine distance filtering, trust scoring)
  → VectorClient    (citation extraction stub)
  → Critic          (citation grounding verification)
  → QueryResponse   (candidates + citations + confidence interval + trace_id)
```

Orchestrated by `src/reasoning/pipeline.py:ReasoningPipeline`.

### API Layer (`src/api/`)

FastAPI server with routes at:
- `POST /api/query` — primary facility search
- `GET /api/facility/{id}/evidence` — audit detail page
- `GET /api/desert/summary` — map data (PIN code deserts)
- `GET /api/demo-moments` — pitch script demo queries
- `GET /api/trace/{id}/timeline` — MLflow trace deep-link
- `GET /api/frontend-contract` — live API contract spec

### Schema Contract (`src/shared/schemas.py`)

**LOCKED after Hour 2.** Core models: `FacilityTrustRecord`, `CapabilityClaim`, `Citation`, `QueryRequest`, `QueryResponse`, `PinCodeDesert`. Append-only additions are OK; any breaking change requires a 5-min sync with Person A and a PR title prefixed `SCHEMA CHANGE:`.

### Mock vs. Real Mode

- `HACKATHON_MODE=mock` (default): reads `fixtures/mock_gold_facility_trust.json` and `fixtures/mock_gold_pin_desert.json`.
- `HACKATHON_MODE=real`: swaps to Databricks Unity Catalog via `databricks-sdk`.
- The switch is handled in `src/api/adapters/gold_reader.py`.

### MLflow Tracing

Every agent function and API handler is decorated with `@traced("name")` from `src/reasoning/tracing/mlflow_setup.py`. The `trace_id` in `QueryResponse` lets the frontend deep-link to the MLflow UI. Local store is `./mlruns/` (gitignored).

### Frontend (`web/`)

Next.js 15 App Router. Key pages: `app/search/`, `app/audit/`, `app/map/`. Uses TanStack React Query for data fetching, Tailwind + shadcn/ui for components, MapBox GL for geographic visualization.

## Sacred Demo Facilities

The smoke test and demo runner depend on these fixture IDs: **F00001**, **F00002**, **F00042**, PIN **855107**. Don't remove or rename them in fixtures.
