# Claude Design Frontend Handoff

## Ownership

Claude Design owns `frontend/**` visual implementation. Person B owns the reasoning/API surface documented here. Do not invent frontend data fields; call these endpoints or ask for an API addition.

The locked shared contract remains `backend/app/shared/schemas.py`. Frontend-specific convenience models live in `backend/app/api/schemas.py` and wrap the shared contract without changing it.

## Required Demo Sequence

1. Fetch `GET /api/demo-moments`.
2. Use the `live-catch` request with `POST /api/query`.
3. Render candidates and dim the flagged `F00002` card.
4. Open `GET /api/facility/F00002/evidence` to show `MISSING_ANESTHESIOLOGIST`.
5. Open `GET /api/facility/F00042/evidence` to show dialysis trust `0.78` with CI `0.66-0.86`.
6. Open `GET /api/desert/summary?capability=emergency_obstetric_care` to drive the map headline and top desert pins.
7. Use `trace_id` from `/api/query` with `GET /api/trace/{trace_id}/timeline` for the visual reasoning narrative.

## Endpoints

### `POST /api/query`

Primary search endpoint. Returns the locked `QueryResponse`:

- `candidates`: Gold facility records for result cards.
- `citations_per_candidate`: evidence snippets grouped by facility.
- `critic_verdict`: `supported`, `partial`, or `unsupported`.
- `critic_reasoning`: plain-English verdict copy.
- `trace_id`: use with the trace timeline endpoint.

### `GET /api/facility/{facility_id}/evidence`

Audit-page payload. Use this instead of re-deriving evidence in the frontend.

- `signals`: one row per capability with self-consistency, coherence, peer anomaly, trust score, CI, flags, and citation count.
- `evidence`: exact source sentence and char range for citation popovers/sheets.
- `flag_summary`: frontend-ready explanation for the live catch.
- `audit_summary`: short summary copy for the audit hero.

### `GET /api/desert/summary`

Map headline payload. Optional query params: `capability`, `state`.

- `population_at_risk`: sum of population for critical desert rows.
- `critical_pin_count`: rows with `desert_score >= 0.85`.
- `top_deserts`: sorted highest-risk pins for hover cards and side sheets.
- `by_state`, `by_capability`: rollups for filters and stats cards.

### `GET /api/trace/{trace_id}/timeline`

Frontend narrative version of raw trace spans.

- `agent`: display name such as Coordinator, Geo-Reasoner, Evidence Retriever, Critic.
- `status`: `supported`, `partial`, `unsupported`, `complete`, or `unknown`.
- `latency_ms`, `token_count`: render when present.
- `summary`: concise explanation for the timeline node.

### `GET /api/frontend-contract`

Machine-readable version of this handoff. Useful for Claude Design while building.

### `GET /api/demo-moments`

Machine-readable pitch script. Treat these three moments as P0.

## Frontend Rules

- Render confidence intervals as ranges, not binary truth.
- Every trust claim needs a visible evidence affordance.
- `danger` styling is only for API failures or unavailable data. Use amber warning styling for trust flags.
- Do not hide `critic_verdict=partial`; that is the live-catch moment.
- If a field is missing from these endpoints, request a backend addition instead of hardcoding fake data.

## Sacred Demo Data

- `F00001`: clean verified Madhepura facility.
- `F00002`: live-catch facility with `MISSING_ANESTHESIOLOGIST`.
- `F00042`: confidence-interval dialysis demo.
- `855107`: high-desert Bihar PIN for emergency obstetric care.
