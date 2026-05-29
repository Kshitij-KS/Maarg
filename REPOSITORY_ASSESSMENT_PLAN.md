# Repository Assessment & Execution Plan

## Executive Summary

**Product:** Maarg (मारग - "The Path") - AI-powered healthcare reasoning system for Indian critical care discovery  
**Team:** MIT Hackathon C03, Team ID HN-9492  
**Architecture:** Two-person split - Truth Layer (Person A) + Reasoning Layer (Person B)  
**Current State:** Functional mock-mode demo with complete pipeline; real Databricks integration requires credentials  

---

## Phase 1: Product Understanding Summary

### Core Vision
Maarg transforms unreliable, unstructured healthcare facility data into **verified, evidence-backed intelligence**. The product answers not just *where* a hospital is, but **whether the record supports what it claims** about critical care capabilities.

### Target Audience
1. Patients and families under emergency time pressure
2. Emergency coordinators and field responders
3. NGOs and public health teams
4. Policy/planning leads allocating resources against evidence

### Core Functionality Flow
```
Claim → Evidence → Validation → Confidence → Action
```

**Key Differentiators:**
- Multi-agent pipeline (Coordinator → GeoReasoner → Citations → Critic) with MLflow tracing
- Calibrated trust scores with confidence intervals, not binary yes/no
- Medical desert visualization on the same Gold facts
- Facility portal for evidence-backed corrections (not silent edits)
- `trace_id` for auditable reasoning traces

### Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, Python 3.11+, Pydantic v2 |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui |
| Data | Mock fixtures (JSON) or Databricks Unity Catalog (real mode) |
| Tracing | MLflow 3.x |
| Maps | Mapbox GL (frontend), haversine calculations (backend) |
| Testing | pytest (backend), Vitest + Testing Library (frontend) |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TRUTH LAYER (Person A)                   │
│  Bronze CSV → Normalizer → Extractor → Trust Engine → Gold  │
└─────────────────────────────────────────────────────────────┘
                              ↓
              gold.facility_trust, gold.pin_desert
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  REASONING LAYER (Person B)                 │
│  Query → Coordinator → GeoReasoner → VectorClient → Critic  │
│                      ↓ MLflow Tracing ↓                     │
│         FastAPI → Next.js UI (Search, Audit, Map, Portal)   │
└─────────────────────────────────────────────────────────────┘
```

### Key Schema Contracts (Locked at Hour 2)

1. **`CapabilityClaim`** - Per (facility, capability) atomic trust unit with:
   - Four signal scores (self-consistency, coherence, peer-anomaly, inference)
   - Trust score, confidence intervals, citations, flags
   
2. **`FacilityTrustRecord`** - One row per facility with aggregated capabilities

3. **`PinCodeDesert`** - Desert score per (PIN, capability) pair

---

## Phase 2: Architecture & Code Quality Status

### Current State Assessment

#### ✅ Strengths
1. **Contract-first design**: Shared Pydantic schemas in `src/shared/schemas.py` and `app/shared/schemas.py`
2. **Mock-first development**: `HACKATHON_MODE=mock` allows testing without Databricks credentials
3. **Comprehensive test coverage**: 87 tests covering API, reasoning, trust engine, portal
4. **MLflow tracing**: All pipeline stages instrumented with `@traced` decorator
5. **Clean agent separation**: Coordinator, GeoReasoner, Critic, LLMAgent have distinct responsibilities
6. **Portal with proof capture**: Camera geolocation, EXIF verification, location discrepancy detection

#### ⚠️ Issues Identified

##### Critical (Security/Correctness)
1. **Duplicate schema files**: `backend/src/shared/schemas.py` vs `backend/app/shared/schemas.py` - potential drift
2. **Hardcoded JWT secret**: `PORTAL_JWT_SECRET` defaults to `"hacknation-demo-portal-secret"` in production code
3. **No rate limiting**: API endpoints exposed without throttling
4. **CORS allow_credentials=False but origins wildcard possible**: Settings need review
5. **Password hash algorithm exposure**: Error messages reveal hashing details
6. **Missing input validation on file uploads**: Proof media upload lacks size/type server-side validation

##### High Priority (Bugs/Edge Cases)
1. **Test failure**: `test_databricks_catalog_explains_missing_sql_connector` expects different error message
2. **GeoReasoner ranking**: Flag penalty uses magic number `0.08`, interval penalty `0.05` - undocumented
3. **Coordinator location extraction**: Only handles "madhepura" alias; no general geocoding
4. **Critic wide interval threshold**: Hardcoded `0.35` without configuration
5. **Empty citation handling**: VectorClient stub returns empty lists silently
6. **Fallback behavior**: LLM failures logged but not surfaced to user

##### Medium Priority (Code Quality)
1. **Magic numbers throughout**: Trust weights, penalties, thresholds scattered
2. **Duplicate constants**: `DEMO_MADHEPURA_LAT/LON` in multiple locations
3. **Type narrowing gaps**: `float | None` patterns could use TypedDict for clarity
4. **Frontend TODO**: `lib/portal-client.ts` mentions missing Zod schemas
5. **Inconsistent error handling**: Some routes raise HTTPException, others return dicts

##### Low Priority (Optimization)
1. **N+1 citation queries**: `answer_query` loops through candidates for citations
2. **Full Gold load on every request**: `load_facility_trust()` reads all records each time
3. **No caching**: No Redis/memory cache for repeated queries
4. **Frontend bundle size**: No analysis of chunk sizes or lazy loading

---

## Phase 3: Proposed Updates & Changes

### Priority 1: Security Hardening (Must Fix Before Demo)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1.1 | Hardcoded JWT secret | `app/portal/api/auth.py` | Require env var, fail loudly if missing in production |
| 1.2 | Password timing attacks | `app/portal/api/auth.py` | Use constant-time comparison everywhere |
| 1.3 | Missing upload validation | `app/portal/api/routes/proof_upload.py` | Add MIME type, size, dimension checks |
| 1.4 | CORS configuration | `app/api/server.py` | Restrict origins to known frontend URLs |
| 1.5 | SQL injection risk | `app/shared/databricks_catalog.py` | Verify parameterized queries |
| 1.6 | Session fixation | `app/portal/api/auth.py` | Regenerate session ID on privilege change |

### Priority 2: Bug Fixes & Edge Cases

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 2.1 | Test failure | `tests/shared/test_databricks_catalog.py` | Update expected error message regex |
| 2.2 | Duplicate schemas | `src/shared/` vs `app/shared/` | Consolidate to single source, add import alias |
| 2.3 | Magic numbers | Multiple | Extract to `app/shared/constants.py` with documentation |
| 2.4 | Empty state handling | `app/reasoning/retrieval/vector_client.py` | Add explicit empty response logging |
| 2.5 | Location parsing | `app/reasoning/agents/coordinator.py` | Extend LOCATION_ALIASES or add geocoding stub |

### Priority 3: Performance Optimization

| # | Target | File(s) | Approach |
|---|--------|---------|----------|
| 3.1 | N+1 citations | `app/reasoning/pipeline.py` | Batch vector client calls |
| 3.2 | Full table scans | `app/shared/catalog.py` | Add in-memory index by PIN/capability |
| 3.3 | Repeated loads | Multiple | Add LRU cache with TTL |
| 3.4 | Frontend re-renders | Components | Memoize expensive computations |

### Priority 4: Code Quality Improvements

| # | Area | Files | Action |
|---|------|-------|--------|
| 4.1 | Type safety | All `.py` files | Enable strict mypy, fix violations |
| 4.2 | Error messages | All routes | Standardize HTTPException usage |
| 4.3 | Documentation | Docstrings | Add examples to all public methods |
| 4.4 | Frontend types | `lib/types.generated.ts` | Run generator, add Zod validation |

---

## Phase 4: Optimization Roadmap

### Immediate (Before Demo)
1. Fix failing test
2. Consolidate duplicate schemas
3. Add environment variable validation for secrets
4. Document all magic numbers

### Short-term (Post-Hackathon)
1. Add Redis caching layer
2. Implement streaming responses for large result sets
3. Add request/response logging middleware
4. Frontend code splitting by route

### Long-term (Production)
1. Database connection pooling
2. Async I/O throughout pipeline
3. Horizontal scaling readiness (stateless design)
4. Comprehensive observability (metrics, alerts)

---

## Phase 5: Execution Strategy

### Step 1: Security Audit & Fixes (2 hours)
- [ ] Review all auth-related code
- [ ] Add input validation schemas (Zod for frontend, Pydantic for backend)
- [ ] Implement rate limiting middleware
- [ ] Add security headers to responses

### Step 2: Bug Resolution (2 hours)
- [ ] Fix failing test
- [ ] Consolidate schemas
- [ ] Handle edge cases (empty results, missing fields)
- [ ] Add comprehensive error boundaries

### Step 3: Performance Pass (1 hour)
- [ ] Add caching to catalog loads
- [ ] Batch citation queries
- [ ] Profile and optimize hot paths

### Step 4: Testing & Verification (1 hour)
- [ ] Run full test suite
- [ ] Manual smoke test of all endpoints
- [ ] Verify frontend-backend contract
- [ ] Test edge cases explicitly

### Step 5: Documentation (30 minutes)
- [ ] Update README with security notes
- [ ] Document environment variables
- [ ] Add API usage examples

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking schema changes | High | Keep backward-compatible, add deprecation warnings |
| Databricks credentials missing | Medium | Mock mode already works; document fallback |
| Time constraints | Medium | Focus on P1 security items first |
| Merge conflicts | Low | Single-owner file policy already in place |

---

## Success Criteria

1. ✅ All tests passing (including previously failing test)
2. ✅ No hardcoded secrets in production paths
3. ✅ Input validation on all user-facing endpoints
4. ✅ Documented configuration requirements
5. ✅ Performance baseline established (response times < 500ms for mock mode)
6. ✅ Frontend-backend type safety verified

---

## Appendix: File Inventory

### Backend Core Files
- `app/api/server.py` - FastAPI entry point
- `app/api/routes/*.py` - Endpoint implementations
- `app/reasoning/pipeline.py` - Main reasoning orchestration
- `app/reasoning/agents/*.py` - Agent implementations
- `app/shared/schemas.py` - API-layer schemas
- `src/shared/schemas.py` - Truth-layer schemas (consolidation target)
- `app/portal/` - Facility portal implementation

### Frontend Core Files
- `app/` - Next.js pages and layouts
- `components/` - React components
- `lib/api.ts` - API client
- `hooks/` - Custom React hooks
- `__tests__/` - Vitest test suite

### Configuration
- `backend/pyproject.toml` - Python dependencies
- `frontend/package.json` - Node dependencies
- `.github/workflows/ci.yml` - CI/CD pipeline

---

**Document Version:** 1.0  
**Generated:** Phase 2 of 4-phase review  
**Next Step:** Proceed to Phase 3 (Optimization, Refactoring, Bug Resolution) upon approval
