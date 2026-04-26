# Hacknation - Reasoning Layer (Person B)

MIT Hackathon Challenge 03 - Indian Healthcare Reasoning Auditor.

We don't trust the data, so we built a system that doesn't have to. A multi-agent reasoning layer that audits 10,000+ Indian medical facility records, scores every capability claim with calibrated confidence, cites the exact sentence behind every decision, and maps the country's true medical deserts.

This repo is **Person B's lane** (Reasoning Layer): agents, API, MLflow tracing. Person A owns the Truth Layer (extraction + trust engine + Gold tables). The two sides meet at a locked Pydantic contract in [`backend/app/shared/schemas.py`](backend/app/shared/schemas.py).

## Status

- Reasoning pipeline: Coordinator, Geo-Reasoner, evidence retrieval stub, Critic, and MLflow tracing.
- FastAPI service under `/api/*` for search, facility evidence, desert summaries, trace timelines, and demo moments.
- Next.js frontend in `frontend/` for guided demo, search, audit, and map flows.
- CLI demo runner producing `backend/outputs/hour8_smoke.json` for the three Money Shot queries.

## Quickstart

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate                 # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cp .env.example .env

# Run all tests.
pytest

# Boot the API.
uvicorn app.api.server:app --reload --port 8000

# Run the no-UI demo (writes backend/outputs/hour8_smoke.json).
python -m app.reasoning.demo
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Smoke a query:

```bash
curl -s -X POST localhost:8000/api/query \
  -H 'content-type: application/json' \
  -d '{"text":"Emergency C-section near Madhepura within 50km","user_lat":25.92,"user_lon":86.79,"max_distance_km":50,"min_trust_score":0.3,"capabilities_filter":["c_section","emergency_obstetric_care"],"top_k":10}'
```

## Required env vars

| Var | Default | Purpose |
| --- | --- | --- |
| `HACKATHON_MODE` | `mock` | `mock` reads `backend/fixtures/`; `real` reads Databricks Unity Catalog (Hour 28+) |
| `MLFLOW_TRACKING_URI` | `./mlruns` | Local MLflow store; swap to Databricks URI for prod |
| `MLFLOW_EXPERIMENT_NAME` | `hacknation-reasoning` | MLflow experiment to log traces under |
| `DATABRICKS_HOST` | (empty) | Required when `HACKATHON_MODE=real` |
| `DATABRICKS_TOKEN` | (empty) | Required when `HACKATHON_MODE=real` |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Frontend API base URL, set in `frontend/.env.local` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | (empty) | Mapbox public token for live maps, set in `frontend/.env.local` |

Use a protected, URL-restricted Mapbox token for deployed applications.

## Demo sequence

1. Launch the frontend and use the home page demo cockpit.
2. Run **The Live Catch** to query Madhepura and surface flagged facility `F00002`.
3. Open **Calibrated Confidence** to audit `F00042` dialysis confidence and citations.
4. Open **The Desert Map** to show emergency obstetric care deserts, population at risk, and critical PIN `855107`.

## Layout

```
backend/
  app/
    shared/      # CO-OWNED with Person A. The contract lives here.
    reasoning/   # Person B owns. Agents, retrieval, tracing.
    api/         # FastAPI routes, frontend presenters, adapters.
    portal/      # Facility portal API, schemas, and services.
  fixtures/      # Person A owns. Mock Gold tables.
  tests/         # Person B owns reasoning/API tests; test_schemas.py is co-owned.
  scripts/       # Utilities (OpenAPI export, fallback fixture seeding).
  outputs/       # CLI runner artifacts (gitignored except .gitkeep).
frontend/        # Next.js demo frontend.
```

## The contract

[`backend/app/shared/schemas.py`](backend/app/shared/schemas.py) is **locked at Hour 2**. Any field rename, removal, or type change requires a 5-minute sync with Person A and a PR titled `SCHEMA CHANGE: ...`. Append-only field additions are fine but should be flagged.

## Tracing

Every agent function and API handler is decorated with `@traced(...)` from [`backend/app/reasoning/tracing/mlflow_setup.py`](backend/app/reasoning/tracing/mlflow_setup.py). The trace id flows through `QueryResponse.trace_id` so the frontend can render `/api/trace/{trace_id}/timeline`.

# Maarg
