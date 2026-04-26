# CURSOR MASTER PROMPT — FACILITY PORTAL LAYER
## MIT Hackathon C03 — Hospital & Clinic Self-Verification Portal

> Paste this as your opening Cursor Composer message OR save as `.cursorrules` in the repo root (separate session from Person A and Person B). Then say: **"Read this in full. Output a detailed implementation plan for the Facility Portal before writing any code."**

---

## 0. CONTEXT — WHAT ALREADY EXISTS

Before writing a single line, understand what has already been built and is already running:

**Person A's Truth Layer (COMPLETE):**
- `src/trust/` — full extraction, normalization, inference graph, trust scoring pipeline
- `gold.facility_trust` — one row per facility with trust scores, capability claims, citations, inference results
- `gold.pin_code_desert` — one row per (PIN code, capability) with desert scores
- `src/shared/schemas.py` — locked Pydantic contract (`FacilityTrustRecord`, `CapabilityClaim`, `InferenceResult`, `PinCodeDesert`, `Citation`)
- `src/shared/capability_inference.yaml` — equipment-to-capability inference graph
- `src/shared/indian_medical_normalizations.yaml` — Indian-English normalization map

**Person B's Reasoning Layer (COMPLETE):**
- `src/reasoning/agents/` — Coordinator, Geo-Reasoner, Critic agents
- `src/reasoning/api/server.py` — FastAPI server exposing query endpoints
- `src/frontend/` — Streamlit app with facility search, trust score display, Folium desert map
- MLflow 3 tracing wired throughout

**You are building the THIRD layer: the Facility Portal.** It must read from and write back into this existing system without breaking anything Person A or Person B has shipped.

**The seam between you and the existing system:**
- You READ from `gold.facility_trust` to show facilities their own data.
- You WRITE to new tables you own (`portal.registrations`, `portal.update_requests`, `portal.proof_media`).
- You NEVER directly write to `gold.facility_trust` or `gold.pin_code_desert`. Updates flow through a controlled verification queue that Person A's pipeline re-ingests.
- You integrate with Person B's FastAPI server by adding new route groups — do not touch existing routes.

---

## 1. THE MISSION

The existing system audits 10,000 Indian medical facility records from an external dataset. The Facility Portal closes the loop: it gives hospitals and clinics a voice in their own data. They can register, see exactly what our agents know about them, and submit evidence-backed correction requests.

**Why this matters for the pitch:**
Most healthcare data systems are extractive — they take from facilities without giving back. We are building a self-improving system where facility corrections become future training signal, improving trust scores over time. That is the pitch: *"We don't just audit the data. We invite the data to audit us back."*

**What the portal does:**
1. Hospitals and clinics register through a web form. Applications are reviewed manually.
2. Once verified, the facility gets a login and can see their own `gold.facility_trust` record — the exact data our agents use to make maps and answer queries.
3. They can submit update requests for specific, allowed fields. Sensitive updates (equipment, capabilities) require location-tagged photo proof.
4. Once a human reviewer approves an update request, it is written into a `portal.approved_updates` table. Person A's pipeline picks it up on the next run and re-ingests it, improving the facility's trust score.

---

## 2. SYSTEM ARCHITECTURE — PORTAL LAYER

```
                    FACILITY PORTAL LAYER (you own all of this)
                    ─────────────────────────────────────────────

  [Browser: Facility-facing React app]
           │
           ▼
  [FastAPI: portal routes on /portal/* ]
  (extends Person B's server.py — new router, not touching existing routes)
           │
           ├──► portal.registrations       (pending/approved/rejected applications)
           ├──► portal.update_requests     (field-level update requests + status)
           ├──► portal.proof_media         (S3/DBFS paths to uploaded photo proofs)
           └──► portal.approved_updates    (approved updates ready for pipeline ingestion)
                    │
                    ▼
           ◄── READ ONLY ──► gold.facility_trust   (Person A's data — never written by you)
           ◄── READ ONLY ──► gold.pin_code_desert  (Person A's data — never written by you)
                    │
                    ▼
           [Person A's pipeline picks up portal.approved_updates on next run]
           [Re-extracts + re-scores → new partition in gold.facility_trust]
```

**Key constraint:** You are a consumer of Gold tables, not a producer. The only way approved updates reach Gold is through Person A's pipeline re-run. You write to `portal.approved_updates`. Person A's `02_extract_silver.py` checks this table at ingestion time and merges approved updates before extraction. This is the integration handshake — agree on the schema of `portal.approved_updates` before building.

---

## 3. NEW DATABASE TABLES — YOU OWN THESE

All new tables live in the `portal` schema in Unity Catalog: `main.portal.*`

### 3.1 `portal.registrations`

```python
class FacilityRegistration(BaseModel):
    """
    A hospital or clinic's application to join the portal.
    Status flows: pending → under_review → approved | rejected
    """
    registration_id: str                      # UUID, generated on submission
    submitted_at: datetime

    # Applicant-provided identity
    facility_name: str
    official_phone: str
    official_email: str
    official_website: Optional[str]
    address_line1: str
    address_line2: Optional[str]
    address_city: str
    address_state_or_region: str
    address_zip_or_postcode: str
    address_country: str = "India"

    # Who is registering
    contact_person_name: str
    contact_person_role: str                  # e.g. "Medical Superintendent", "Administrator"
    contact_person_phone: str
    contact_person_email: str

    # Proof of authority documents (DBFS paths to uploaded files)
    proof_documents: List[str]                # e.g. NMC registration cert, GST cert

    # Matching to existing Gold data
    matched_facility_id: Optional[str]        # set by reviewer if matched to gold.facility_trust
    match_confidence: Optional[float]         # 0-1, auto-computed by fuzzy match

    # Review workflow
    status: Literal["pending", "under_review", "approved", "rejected"]
    reviewer_notes: Optional[str]
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[str]                # reviewer's ID

    # Portal access (set on approval)
    portal_user_id: Optional[str]
    portal_access_token_hash: Optional[str]   # bcrypt hash, never plaintext
```

### 3.2 `portal.update_requests`

```python
class UpdateRequest(BaseModel):
    """
    A verified facility's request to update one or more fields in their record.
    One row per field being updated. Granular — not a bulk patch.
    """
    request_id: str                           # UUID
    facility_id: str                          # matched to gold.facility_trust.facility_id
    portal_user_id: str
    submitted_at: datetime

    # What field is being updated
    field_name: str                           # must be in ALLOWED_UPDATE_FIELDS (see §6)
    field_category: Literal[
        "contact",        # phone, email, website
        "address",        # address lines, city, postcode
        "profile",        # description, yearEstablished, social links
        "operational",    # numberDoctors, capacity
        "clinical",       # specialties, procedures — requires photo proof
        "equipment",      # equipment list — requires photo proof + location
        "capability",     # capability claims — requires photo proof + equipment proof
    ]
    old_value: Optional[str]                  # serialized as JSON string for complex types
    new_value: str                            # serialized as JSON string for complex types
    justification: str                        # facility's explanation for the change

    # Proof (required for clinical, equipment, capability categories)
    requires_proof: bool
    proof_media_ids: List[str]                # references to portal.proof_media
    location_verified: bool = False           # True if GPS coordinates were captured with proof
    proof_location_lat: Optional[float]
    proof_location_lon: Optional[float]
    proof_location_accuracy_m: Optional[float]

    # Review workflow
    status: Literal["pending", "under_review", "approved", "rejected", "needs_more_info"]
    reviewer_notes: Optional[str]
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[str]

    # Impact tracking
    applied_to_pipeline: bool = False         # True once Person A's pipeline picks it up
    applied_at: Optional[datetime]
    resulting_extraction_run_id: Optional[str]
```

### 3.3 `portal.proof_media`

```python
class ProofMedia(BaseModel):
    """
    A photo or document uploaded as proof for an update request.
    Files stored in DBFS or S3. Never store raw bytes in Delta.
    """
    media_id: str                             # UUID
    update_request_id: str
    facility_id: str
    uploaded_at: datetime

    # File reference
    storage_path: str                         # DBFS or S3 URI
    original_filename: str
    mime_type: str                            # "image/jpeg", "image/png", "application/pdf"
    file_size_bytes: int

    # Location metadata (captured from browser geolocation at time of photo)
    location_lat: Optional[float]
    location_lon: Optional[float]
    location_accuracy_m: Optional[float]
    location_captured_at: Optional[datetime]

    # EXIF metadata extracted from image (for verification)
    exif_datetime: Optional[datetime]         # datetime from image EXIF — cross-check with upload time
    exif_gps_lat: Optional[float]             # GPS from EXIF if camera embedded it
    exif_gps_lon: Optional[float]
    exif_device_model: Optional[str]

    # Reviewer assessment
    location_verified: bool = False           # reviewer confirms location matches facility
    content_verified: bool = False            # reviewer confirms photo shows claimed equipment
    reviewer_notes: Optional[str]
```

### 3.4 `portal.approved_updates`

```python
class ApprovedUpdate(BaseModel):
    """
    An approved update ready for Person A's pipeline to ingest.
    Person A's 02_extract_silver.py reads this and merges before re-extraction.
    THIS IS THE INTEGRATION HANDSHAKE WITH PERSON A — agree on this schema first.
    """
    update_id: str                            # = request_id from portal.update_requests
    facility_id: str
    field_name: str
    new_value: str                            # JSON-serialized
    approved_at: datetime
    approved_by: str
    proof_verified: bool                      # was photo proof reviewed and approved
    ingested: bool = False                    # Person A flips this to True after pipeline run
    ingestion_run_id: Optional[str]           # Person A's extraction_run_id
```

### 3.5 `portal.portal_users`

```python
class PortalUser(BaseModel):
    """
    An authenticated facility representative with portal access.
    Created on registration approval.
    """
    user_id: str                              # UUID
    facility_id: str                          # gold.facility_trust.facility_id
    registration_id: str
    email: str
    password_hash: str                        # bcrypt, never plaintext
    created_at: datetime
    last_login: Optional[datetime]
    is_active: bool = True
    role: Literal["facility_admin", "facility_viewer"] = "facility_admin"
```

---

## 4. FILES YOU OWN

```
src/portal/                                  # ← all yours
├── api/
│   ├── router.py                            # FastAPI APIRouter — mounts on /portal
│   ├── auth.py                              # JWT auth, login, token refresh
│   ├── routes/
│   │   ├── registration.py                  # POST /portal/register, GET /portal/register/{id}
│   │   ├── facility_view.py                 # GET /portal/facility/me (read own Gold record)
│   │   ├── update_requests.py               # POST, GET /portal/updates
│   │   ├── proof_upload.py                  # POST /portal/proof/upload
│   │   └── review_admin.py                  # Admin routes for human reviewer
│   └── dependencies.py                      # Auth dependency injection
├── db/
│   ├── portal_tables.py                     # Delta table read/write helpers for portal.*
│   └── gold_reader.py                       # READ-ONLY wrapper for gold.facility_trust
├── services/
│   ├── registration_service.py              # Business logic for registration flow
│   ├── update_service.py                    # Business logic for update request flow
│   ├── proof_service.py                     # File upload, EXIF extraction, location verify
│   ├── matcher.py                           # Fuzzy match registration to gold.facility_trust
│   └── notification_service.py             # Email notifications on status changes
├── frontend/                                # React (Vite + TypeScript)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Register.tsx                 # Step 1: Registration form
│   │   │   ├── RegistrationStatus.tsx       # Step 2: Application status page
│   │   │   ├── Login.tsx                    # Portal login
│   │   │   ├── FacilityDashboard.tsx        # Main dashboard — shows Gold data
│   │   │   ├── UpdateRequest.tsx            # Field-level update request form
│   │   │   ├── ProofCapture.tsx             # Camera + location capture component
│   │   │   └── AdminReview.tsx              # Human reviewer queue
│   │   ├── components/
│   │   │   ├── TrustScoreCard.tsx           # Shows facility's trust score + breakdown
│   │   │   ├── CapabilityTable.tsx          # Shows capability claims + inference results
│   │   │   ├── UpdateRequestCard.tsx        # Shows status of submitted requests
│   │   │   ├── CameraCapture.tsx            # Camera + geolocation proof component
│   │   │   └── FieldEditForm.tsx            # Inline field edit with proof gating
│   │   └── api/
│   │       └── portalClient.ts              # Typed API client for all portal routes
├── schemas/
│   └── portal_schemas.py                    # Pydantic models from §3 above
└── tests/
    ├── test_registration.py
    ├── test_update_requests.py
    ├── test_proof_service.py
    └── test_matcher.py

notebooks/
└── C_admin_review.ipynb                     # Reviewer's notebook for manual verification
```

**Do NOT touch:**
- `src/trust/` — Person A's domain
- `src/reasoning/` — Person B's domain
- `src/frontend/` — Person B's Streamlit app
- `gold.*` tables — read-only for you

**Integration points (touch carefully, with notice):**
- `src/reasoning/api/server.py` — add one line: `app.include_router(portal_router, prefix="/portal")`
- `src/shared/schemas.py` — read only. If you need a new schema field, propose it to Person A first.
- `src/trust/pipelines/02_extract_silver.py` — Person A adds a `portal.approved_updates` merge step. You provide the schema; Person A implements the ingestion.

---

## 5. THE REGISTRATION FLOW — STEP BY STEP

### Step 1: Facility Submits Application (Public — no auth required)

**Frontend route:** `/register`

**Form fields (required unless marked optional):**
```
Facility Information:
  - Facility Name *
  - Official Phone Number *
  - Official Email *
  - Official Website (optional)
  - Address Line 1 *
  - Address Line 2 (optional)
  - City *
  - State/Region *
  - PIN Code *
  - Facility Type * (dropdown: Government Hospital / Private Hospital / Clinic / Charitable / Nursing Home / Diagnostic Centre)

Contact Person (who is submitting this):
  - Full Name *
  - Role/Designation * (e.g. Medical Superintendent, Administrator, Owner)
  - Phone *
  - Email *

Proof of Authority (upload, at least 1 required):
  - NMC/MCI Registration Certificate
  - GST Registration Certificate
  - NABH Accreditation (if applicable)
  - State Health Department Registration
  - Any government-issued facility licence

Declaration checkbox:
  "I confirm that I am an authorized representative of this facility and that all information provided is accurate."
```

**Backend behavior:**
1. Validate all required fields. Return field-level errors (never generic "form error").
2. Upload proof documents to DBFS: `dbfs:/portal/proof_docs/{registration_id}/`
3. Write to `portal.registrations` with `status="pending"`.
4. Run `matcher.py` to fuzzy-match the submitted facility name + address against `gold.facility_trust`. Set `matched_facility_id` and `match_confidence` if match found (threshold: 0.75).
5. Send confirmation email to contact person with registration ID and expected review timeline (48 hours for the hackathon demo — in production this is real).
6. Return `registration_id` to frontend. Redirect to `/register/status/{registration_id}`.

**Matching logic in `matcher.py`:**
```python
def match_to_gold(
    facility_name: str,
    address_city: str,
    address_state: str,
    pin_code: str,
    gold_facilities: List[FacilityTrustRecord],
) -> tuple[Optional[str], float]:
    """
    Fuzzy-match a registration submission to an existing gold.facility_trust record.
    Returns (facility_id, confidence) or (None, 0.0) if no match above threshold.

    Scoring:
    - Name similarity (RapidFuzz token_sort_ratio): 50% weight
    - PIN code exact match: 30% weight
    - City name similarity: 20% weight

    Threshold: 0.75 combined score triggers a match.
    """
```

### Step 2: Status Page (Public — accessible via registration_id)

**Frontend route:** `/register/status/{registration_id}`

Shows:
- Current status (pending / under review / approved / rejected) with a visual step indicator
- If approved: link to portal login + temporary password instructions
- If rejected: reviewer notes explaining why
- If needs more info: what documents are missing

### Step 3: Reviewer Approves (Admin — protected)

**Frontend route:** `/admin/review` (protected by admin token)
**Notebook:** `notebooks/C_admin_review.ipynb`

The reviewer sees:
- List of pending applications sorted by submission date
- Submitted facility details alongside the fuzzy-matched Gold record (if found)
- Side-by-side diff: "What they claim" vs "What our data shows"
- Proof document viewer
- Actions: Approve (with optional match correction) / Reject (with reason) / Request More Info

On approval:
1. Set `registration.status = "approved"`, `registration.matched_facility_id = confirmed_id`
2. Create `portal.portal_users` record with hashed temporary password
3. Send welcome email with login link

---

## 6. ALLOWED UPDATE FIELDS — THE PERMISSION MATRIX

This is the core policy decision. Be precise. Some fields are self-reportable. Others require evidence. Others are forbidden (system-computed or too sensitive to trust self-report).

```python
# src/portal/services/update_service.py

ALLOWED_UPDATE_FIELDS = {

    # ── CONTACT (no proof required) ──────────────────────────────────────────
    "phone_numbers": {
        "category": "contact",
        "requires_proof": False,
        "description": "List of contact phone numbers",
        "value_type": "list[str]",
        "validation": "each item must be a valid Indian phone number (10 digits or with +91)",
    },
    "official_phone": {
        "category": "contact",
        "requires_proof": False,
        "value_type": "str",
    },
    "email": {
        "category": "contact",
        "requires_proof": False,
        "value_type": "str",
        "validation": "valid email format",
    },
    "websites": {
        "category": "contact",
        "requires_proof": False,
        "value_type": "list[str]",
    },
    "official_website": {
        "category": "contact",
        "requires_proof": False,
        "value_type": "str",
        "validation": "valid URL",
    },

    # ── SOCIAL PROFILES (no proof required) ──────────────────────────────────
    "facebook_link": {"category": "profile", "requires_proof": False, "value_type": "str"},
    "twitter_link":  {"category": "profile", "requires_proof": False, "value_type": "str"},
    "linkedin_link": {"category": "profile", "requires_proof": False, "value_type": "str"},
    "instagram_link":{"category": "profile", "requires_proof": False, "value_type": "str"},

    # ── PROFILE (no proof required) ──────────────────────────────────────────
    "year_established": {
        "category": "profile",
        "requires_proof": False,
        "value_type": "int",
        "validation": "between 1800 and current year",
    },
    "description": {
        "category": "profile",
        "requires_proof": False,
        "value_type": "str",
        "validation": "max 2000 characters",
    },

    # ── ADDRESS (no proof required, but reviewed) ─────────────────────────────
    "address_line1":            {"category": "address", "requires_proof": False, "value_type": "str"},
    "address_line2":            {"category": "address", "requires_proof": False, "value_type": "str"},
    "address_line3":            {"category": "address", "requires_proof": False, "value_type": "str"},
    "address_city":             {"category": "address", "requires_proof": False, "value_type": "str"},
    "address_state_or_region":  {"category": "address", "requires_proof": False, "value_type": "str"},
    "address_zip_or_postcode":  {"category": "address", "requires_proof": False, "value_type": "str"},

    # ── OPERATIONAL (no proof required) ──────────────────────────────────────
    "number_doctors": {
        "category": "operational",
        "requires_proof": False,
        "value_type": "int",
        "validation": "between 0 and 10000",
    },
    "capacity": {
        "category": "operational",
        "requires_proof": False,
        "value_type": "int",
        "validation": "bed count, between 0 and 10000",
    },

    # ── CLINICAL — requires photo proof + location ────────────────────────────
    "specialties": {
        "category": "clinical",
        "requires_proof": True,
        "proof_instruction": "Upload a photo of your facility's displayed specialties board, signage, or OPD department listing.",
        "value_type": "list[str]",
    },
    "procedures": {
        "category": "clinical",
        "requires_proof": True,
        "proof_instruction": "Upload a photo of the procedure theatre, procedure room, or official procedure list displayed at the facility.",
        "value_type": "list[str]",
    },

    # ── EQUIPMENT — requires photo proof + location ───────────────────────────
    "equipment": {
        "category": "equipment",
        "requires_proof": True,
        "proof_instruction": "For each piece of equipment you are claiming, upload a clear photo showing the equipment in your facility. Your current location will be recorded to verify the photo was taken at the facility.",
        "value_type": "list[str]",
        "notes": "Each equipment item should have at least one corresponding photo in proof_media.",
    },

    # ── CAPABILITY — requires photo + equipment proof ─────────────────────────
    "capability": {
        "category": "capability",
        "requires_proof": True,
        "proof_instruction": "Capability claims are derived from equipment and staff. To update a capability claim, you must first submit an equipment update with photo proof for all equipment items that support this capability. Capability updates without supporting equipment proof will be rejected.",
        "value_type": "list[str]",
        "notes": "The system will cross-reference your capability claim against the Equipment-to-Capability Inference Graph. Claims without supporting equipment evidence will not be approved.",
    },
}

# These fields are EXPLICITLY FORBIDDEN from self-update — system-computed only
FORBIDDEN_UPDATE_FIELDS = [
    "facility_id",
    "overall_trust_score",
    "capabilities",                           # CapabilityClaim objects — computed by pipeline
    "extraction_run_ids",
    "last_updated",
    "recency_of_page_update",
    "distinct_social_media_presence_count",   # computed from social links — not self-reported
    "affiliated_staff_presence",              # computed by pipeline
    "custom_logo_presence",                   # computed by pipeline
    "number_of_facts_about_the_organization", # computed by pipeline
    "post_metrics_most_recent_social_media_post_date",  # scraped, not self-reported
    "post_metrics_post_count",
    "engagement_metrics_n_followers",
    "engagement_metrics_n_likes",
    "engagement_metrics_n_engagements",
    # Coordinates — self-reported lat/lon is unreliable;
    # location is verified from EXIF data in proof photos
    "latitude",
    "longitude",
    # Taxonomy IDs — require human classification
    "facility_type_id",
    "operator_type_id",
    "affiliation_type_ids",
    # Admin fields
    "address_country",
    "address_country_code",
]
```

**Why coordinates are forbidden for direct edit:** Latitude and longitude affect desert score calculations and map display. We do not trust self-reported coordinates. Instead, if a facility submits equipment proof photos with location enabled, we extract GPS coordinates from either the browser's Geolocation API or the image EXIF data. A human reviewer confirms the location matches the facility address before updating `lat`/`lon` in the approved update. This makes our location data more trustworthy than any self-reported value.

---

## 7. THE PROOF CAPTURE FLOW — DETAILED

This is the most technically nuanced part. Get it right.

### 7.1 Frontend: `CameraCapture.tsx`

When a user tries to update a field in the `equipment`, `clinical`, or `capability` categories, the UI must:

1. **Show a clear explanation** of why proof is needed and what a good photo looks like (give an example).
2. **Request location permission** before the camera opens. If denied, show: *"Location permission is required to verify this photo was taken at your facility. Please enable location access in your browser settings."* Do not allow photo capture without location.
3. **Open the device camera** (using `navigator.mediaDevices.getUserMedia`). On mobile, prefer the rear camera (`facingMode: 'environment'`). On desktop, allow webcam with a note that a phone photo upload is preferred for equipment.
4. **Capture the photo.** At the moment of capture, record:
   - Browser geolocation: `navigator.geolocation.getCurrentPosition()` — capture lat, lon, accuracy
   - Capture timestamp
5. **Show a preview** of the captured photo with the location coordinates displayed below it. The user must confirm: *"This photo was taken at my facility and shows the equipment I am claiming."*
6. **Upload the photo** with all metadata to `POST /portal/proof/upload`.
7. Allow the user to add multiple photos for a single equipment update (one per item).
8. Only enable the "Submit Update Request" button once at least one proof photo is uploaded.

```typescript
// src/portal/frontend/src/components/CameraCapture.tsx
interface CaptureResult {
  photoBlob: Blob;
  locationLat: number;
  locationLon: number;
  locationAccuracyM: number;
  capturedAt: string;  // ISO timestamp
}

// Key constraint: location must be captured BEFORE photo is shown to user
// Never allow submitting a photo without an attached location
```

### 7.2 Backend: `proof_service.py`

On receiving an uploaded photo:

1. **Store the file** to DBFS: `dbfs:/portal/proof_photos/{facility_id}/{request_id}/{media_id}.jpg`
2. **Extract EXIF metadata** using `Pillow` (pillow>=10.0):
   ```python
   from PIL import Image
   from PIL.ExifTags import TAGS, GPSTAGS

   def extract_exif(image_path: str) -> dict:
       """Extract datetime, GPS, and device model from EXIF."""
   ```
3. **Cross-validate location:** Compare browser-reported GPS with EXIF GPS (if present). If they differ by >500m, flag for reviewer: `location_discrepancy_detected=True`.
4. **Cross-validate timestamp:** Compare browser-reported capture time with EXIF datetime. If they differ by >5 minutes, flag for reviewer: `timestamp_discrepancy_detected=True`.
5. Write `portal.proof_media` record with all metadata and flags.
6. Return `media_id` to frontend.

### 7.3 Reviewer: Proof Verification

In the `AdminReview.tsx` page and `C_admin_review.ipynb`, the reviewer sees:

- The photo displayed full-size
- A Google Maps embed showing where the photo was claimed to be taken (from browser GPS)
- The EXIF GPS location as a second pin (if available) — reviewer can see if they match
- The EXIF timestamp vs upload timestamp comparison
- Any auto-detected discrepancy flags
- The facility's registered address alongside the claimed photo location
- **Distance from facility address to photo location** (computed haversine distance)
- Actions: ✅ Location verified / ❌ Location mismatch / ⚠️ Needs clarification

**Acceptance criteria for location verification:**
- Photo GPS (browser or EXIF) must be within 500m of the facility's registered address coordinates
- EXIF timestamp must be within 7 days of submission (not a stock photo from the internet)
- Photo must visibly show equipment in an indoor clinical setting

---

## 8. THE FACILITY DASHBOARD — WHAT FACILITIES SEE

**Frontend route:** `/dashboard` (requires login)

The dashboard has three panels:

### Panel 1: Your Data (Read-only view of Gold record)

Shows the facility's `FacilityTrustRecord` from `gold.facility_trust` in a human-readable format. Use friendly language — this is not an admin interface, it is a hospital administrator's view.

```
Your Facility Profile — as of [last_updated]
─────────────────────────────────────────────
Name:          [facility_name]
PIN Code:      [pin_code]
State:         [state]
District:      [district]
Type:          [facility_type]

Your Trust Score: 74/100   [visual meter — green/amber/red]
Based on our analysis of your facility records.

Your Capability Assessments:
┌─────────────────────────┬──────────┬────────────────────────────────────────────────┐
│ Capability              │ Score    │ What Our System Found                          │
├─────────────────────────┼──────────┼────────────────────────────────────────────────┤
│ Advanced Surgery        │ ⚠️ 0.31  │ Claimed, but no anesthesia machine found.      │
│                         │          │ "OT available, surgeon visits twice a week"    │
│                         │          │ Flag: EQUIPMENT_CLAIM_MISMATCH                 │
├─────────────────────────┼──────────┼────────────────────────────────────────────────┤
│ Emergency Obstetric Care│ ✅ 0.88  │ Verified. Labour room + OB-GYN on staff.      │
│                         │          │ "24x7 obstetric care, resident gynecologist"   │
└─────────────────────────┴──────────┴────────────────────────────────────────────────┘

[Request a Correction] button next to each row
```

**Critical UX requirement:** Do not show raw field names or JSON. Translate everything to plain English. Show the citation sentence that caused a low score so the facility understands exactly what our system read and why it reached that conclusion.

### Panel 2: Your Update Requests

Shows all submitted update requests with status:

```
Your Update Requests
─────────────────────────────────────────────────────────────
#001  Equipment: Ventilators          ✅ Approved  (3 days ago)
      "We now have 2 ventilators in our ICU ward."
      Photo proof: verified ✅  Location: verified ✅

#002  Phone Number                     🕐 Under Review
      Old: 0631-224455  New: 0631-224466
      Submitted 1 day ago

#003  Specialties: Cardiology          ❌ Rejected
      "Please provide documentation of a cardiologist on permanent staff."
```

### Panel 3: How to Improve Your Score

A simple, actionable list based on the facility's current flags:

```
How to Improve Your Trust Score
─────────────────────────────────────────────────────────────
🔴 Missing: Anesthesiologist confirmation
   Your facility claims Advanced Surgery but our records show
   no anesthesiologist on staff. If you have one, submit an
   update with photo proof of their registration certificate.
   [Submit Update] →

🟡 Unverified: ICU bed count
   Your record mentions an ICU but the number of beds is unclear.
   Submit the actual bed count to improve your ICU trust score.
   [Submit Update] →

🟢 Verified: Emergency Obstetric Care (no action needed)
```

---

## 9. THE UPDATE REQUEST FLOW — END TO END

```
1. Facility clicks [Request a Correction] on a specific capability/field
          │
          ▼
2. UpdateRequest.tsx opens with the field pre-selected
   Shows: current value (from Gold) | new value input | justification text
          │
          ▼
3. If field_category in ["equipment", "clinical", "capability"]:
   → CameraCapture.tsx opens
   → User must grant location, take photo, confirm
   → Photo uploaded → proof_media_id returned
          │
          ▼
4. POST /portal/updates — creates UpdateRequest record (status: "pending")
          │
          ▼
5. Admin sees request in review queue (AdminReview.tsx)
   → Reviews field change + proof photos + location verification
   → If approved: UpdateRequest.status = "approved"
                  → write to portal.approved_updates
          │
          ▼
6. Person A's pipeline (02_extract_silver.py) on next run:
   → reads portal.approved_updates WHERE ingested = False
   → merges approved values into facility's source record
   → re-runs extraction + trust scoring
   → writes new partition to gold.facility_trust
   → sets portal.approved_updates.ingested = True
          │
          ▼
7. Facility's dashboard reflects new trust score
   UpdateRequest card shows: "Applied to system on [date]. Your new trust score: X"
```

---

## 10. FASTAPI ROUTE SPECIFICATION

Mount as: `app.include_router(portal_router, prefix="/portal", tags=["Facility Portal"])`

```python
# POST   /portal/register                    — submit registration application
# GET    /portal/register/{registration_id}  — check registration status (public)
# POST   /portal/login                       — get JWT token
# POST   /portal/token/refresh               — refresh JWT
# GET    /portal/facility/me                 — get own gold.facility_trust record (auth required)
# GET    /portal/facility/me/score           — get trust score summary + improvement suggestions
# POST   /portal/updates                     — submit an update request (auth required)
# GET    /portal/updates                     — list own update requests (auth required)
# GET    /portal/updates/{request_id}        — get specific update request status
# POST   /portal/proof/upload                — upload proof photo + location metadata
# GET    /portal/proof/{media_id}            — get proof media metadata

# Admin routes (protected by admin token, not facility JWT):
# GET    /portal/admin/registrations         — list all registrations
# PATCH  /portal/admin/registrations/{id}    — approve/reject registration
# GET    /portal/admin/updates               — list all update requests
# PATCH  /portal/admin/updates/{id}          — approve/reject update request
# GET    /portal/admin/proof/{media_id}/file — serve proof photo to reviewer
```

**Authentication:**
- Facility routes use JWT (HS256). Token contains `user_id`, `facility_id`, `role`, `exp`.
- Admin routes use a separate static bearer token set in environment variables. Never hardcode.
- Token expiry: 8 hours for facility users. Refresh via `/portal/token/refresh`.

---

## 11. INTEGRATION WITH PERSON A's PIPELINE

This is the most critical integration point. Implement it carefully and test it with Person A before the demo.

**What you deliver to Person A:**
The schema of `portal.approved_updates` (already defined in §3.4). Once an update is approved, your code writes a row to this table. Person A's code reads it.

**What Person A implements (propose this to them):**
At the start of `02_extract_silver.py`, before extraction:
```python
# Person A adds this block to 02_extract_silver.py
def merge_approved_updates(facilities_df: DataFrame) -> DataFrame:
    """
    Merge portal-approved updates into the raw facilities DataFrame
    before extraction. Approved updates override the original field value.
    This is how facility corrections improve their trust score.
    """
    approved = spark.table("main.portal.approved_updates").filter(~col("ingested"))
    # pivot approved updates into a per-facility patch dict
    # apply patches to facilities_df
    # mark applied updates as ingested
    return patched_df
```

**What you must guarantee:**
- Every row in `portal.approved_updates` has `facility_id` that matches `gold.facility_trust.facility_id` exactly
- `field_name` values match the field names in the source dataset (not the Pydantic schema field names — the raw dataset column names)
- `new_value` is always valid JSON (even for simple strings: `"\"New Phone Number\""`)
- `ingested` starts as `False`; only Person A's pipeline sets it to `True`

**Sync point:** Before building `portal.approved_updates` write logic, do a 5-minute sync with Person A to confirm the exact field name mapping between portal field names and the raw dataset column names.

---

## 12. TECH STACK — PORTAL LAYER

**Frontend:** React 18 + TypeScript + Vite. TailwindCSS for styling. No UI library (keep it fast to build). Axios for API calls. React Query for server state.

**Backend:** Extend Person B's FastAPI server. New `APIRouter` in `src/portal/api/router.py`. Mount in Person B's `server.py` with one line.

**Auth:** PyJWT for token generation. `passlib[bcrypt]` for password hashing. Add both to `pyproject.toml` with Person A's sync.

**File storage:** DBFS for proof photos (Databricks File System). Use the Databricks SDK's `dbutils.fs.put()` or the Files API. Never store binary data in Delta tables.

**EXIF extraction:** `Pillow>=10.0` — already likely in the environment. If not, add to `pyproject.toml`.

**Fuzzy matching:** `rapidfuzz>=3.0` for facility name matching during registration.

**Email notifications:** For the hackathon demo, use `smtplib` with a demo Gmail account OR simply log the email content to a file (`demo/email_log.txt`). Do not block registration on email delivery.

**Maps in admin review:** Use the Google Maps Static API URL pattern (no JS SDK needed): `https://maps.googleapis.com/maps/api/staticmap?center={lat},{lon}&markers={lat},{lon}&zoom=16&size=400x300&key={API_KEY}`. For the hackathon, use OpenStreetMap tile URL directly in an `<img>` tag to avoid API key setup.

**Forbidden in Portal code:** Direct writes to `gold.*` tables. Direct writes to `silver.*` tables. Calls to Person A's Trust Engine functions (you are not re-running trust scoring — Person A's pipeline does that). Hardcoded admin passwords.

---

## 13. DEMO MOMENTS YOU ARE ENGINEERING FOR

**Money Shot 1: The Caught Lie — Closed**
Demo flow: Show the facility with `EQUIPMENT_CLAIM_MISMATCH` on Advanced Surgery in the existing system. Then: *"This hospital just registered on our portal. They see the same data we do. They've uploaded a photo of their new anesthesia machine — purchased last month. Our reviewer approved it. Watch what happens when Person A's pipeline runs."* Run the pipeline live or show a pre-recorded result. The trust score goes from 0.31 to 0.79. The flag clears. The map updates.

**Money Shot 2: The Facility's Perspective**
Open the facility dashboard. Show the capability table with plain-English explanations of why each score is what it is. *"For the first time, this hospital in Madhepura can see exactly what any ambulance dispatcher in India sees when they search for emergency obstetric care in their district. And if something is wrong, they can fix it — with evidence."*

**Money Shot 3: The Proof Flow**
On mobile, navigate to a capability update. Show the camera opening, location being captured, photo being taken. Show the admin review panel with the GPS pin on a map. *"We don't just take a facility's word for it. We verify where the photo was taken."*

---

## 14. ANTI-PATTERNS — DO NOT DO THESE

- ❌ **Writing directly to gold.* tables.** Ever. Under any circumstances. Even in the demo. The Gold tables are Person A's. You write to `portal.*` only.
- ❌ **Allowing capability updates without equipment proof.** If a facility claims a new capability, they must first submit equipment proof that supports that capability via the inference graph. No capability update without supporting equipment.
- ❌ **Trusting self-reported latitude/longitude.** Do not add lat/lon to `ALLOWED_UPDATE_FIELDS`. Location is verified from photo EXIF or browser GPS cross-checked against the registered address.
- ❌ **Storing photos as base64 in Delta tables.** Binary data goes to DBFS. Delta stores the path string only.
- ❌ **Auto-approving any update.** Every update, including a phone number change, goes through the manual review queue. For the demo, pre-approve 2–3 updates to show the flow, but the architecture must require human review.
- ❌ **Showing raw Pydantic field names to facilities.** The UI must translate `overall_trust_score` to "Your Trust Score" and `EQUIPMENT_CLAIM_MISMATCH` to "Equipment proof needed." Facilities are not engineers.
- ❌ **One giant React page.** Each major flow (register, dashboard, update, proof capture, admin review) is its own page with its own route. Use React Router.
- ❌ **Forgetting mobile.** The proof capture flow is inherently mobile. The frontend must be responsive. Test CameraCapture.tsx on a mobile browser, not just desktop.
- ❌ **Blocking the demo on email.** Email notifications are a nice-to-have. If SMTP setup takes more than 15 minutes, log to file and move on.

---

## 15. HOUR-BY-HOUR BUILD PLAN

*(Assumes you start after Person A and B are already running — estimate ~8 hours of build time)*

| Hour | Deliverable |
|---|---|
| 0–1 | Repo structure, `portal_schemas.py` complete, `pyproject.toml` updated (rapidfuzz, PyJWT, passlib, Pillow added). Agree `portal.approved_updates` schema with Person A. Create all 5 Delta tables in `main.portal.*`. |
| 1–2 | Registration API (`POST /portal/register`) + matcher.py + `portal.registrations` write. Registration form frontend (no styling yet — just functional). |
| 2–3 | Auth: login route, JWT generation, auth dependency. Status page (`/register/status/{id}`). Admin approval route. Create pre-approved demo registrations fixture. |
| 3–4 | Facility dashboard backend: `GET /portal/facility/me` reading from `gold.facility_trust`. Translate raw schema to human-readable format. Trust score card + capability table frontend components. |
| 4–5 | Update request backend: `POST /portal/updates`, validation against `ALLOWED_UPDATE_FIELDS`, `portal.update_requests` write. Field edit form frontend. |
| 5–6 | Proof upload: `POST /portal/proof/upload`, DBFS storage, EXIF extraction, location cross-validation, `portal.proof_media` write. CameraCapture.tsx with geolocation. |
| 6–7 | Admin review frontend: registration queue, update request queue, proof photo viewer with GPS map embed. Approve/reject actions. `portal.approved_updates` write on approval. |
| 7–8 | Polish demo flow. Pre-populate fixtures for all 3 demo moments. Test full registration → dashboard → update → proof → approval → pipeline re-run flow end-to-end. |

---

## 16. SELF-CHECK BEFORE DEMO

- [ ] Registration form submits and writes to `portal.registrations`
- [ ] Fuzzy matcher correctly matches demo facility to its `gold.facility_trust` record
- [ ] Login works and returns a valid JWT
- [ ] Facility dashboard shows real data from `gold.facility_trust` in human-readable form
- [ ] Capability table shows `EQUIPMENT_CLAIM_MISMATCH` flag for demo facility #2 with plain-English explanation
- [ ] Equipment update form requires camera + location before allowing submission
- [ ] `CameraCapture.tsx` correctly captures GPS coordinates from browser
- [ ] Proof photo upload stores to DBFS and extracts EXIF data
- [ ] Admin review page shows proof photo + GPS location map
- [ ] Approve action writes to `portal.approved_updates`
- [ ] Person A's pipeline can read `portal.approved_updates` and the ingested flag flips to True
- [ ] After pipeline re-run, dashboard shows updated trust score
- [ ] No direct writes to `gold.*` tables anywhere in portal code
- [ ] Mobile: CameraCapture.tsx works on phone browser (test this explicitly)
- [ ] All 3 demo moments produce the expected output

---

## 17. FIRST ACTIONS — DO THESE NOW (in order)

When you receive this prompt and say "go", your first response is:

1. **Output a numbered plan for Hours 0–4** (schema, tables, registration API, auth, dashboard API). Do not write code yet.
2. Wait for approval.
3. Then immediately do a **sync with Person A** on the `portal.approved_updates` schema — propose the exact schema from §3.4 and get confirmation that their pipeline can ingest it.
4. Create files in this order:
   - `src/portal/schemas/portal_schemas.py`
   - `src/portal/db/portal_tables.py` (table creation + read/write helpers)
   - `src/portal/db/gold_reader.py` (read-only wrapper for gold.facility_trust)
   - `src/portal/services/matcher.py`
   - `src/portal/services/update_service.py` (with `ALLOWED_UPDATE_FIELDS`)
   - `src/portal/api/auth.py`
   - `src/portal/api/routes/registration.py`
   - `src/portal/api/routes/facility_view.py`
   - `src/portal/api/routes/update_requests.py`
   - `src/portal/api/routes/proof_upload.py`
   - `src/portal/api/routes/review_admin.py`
   - `src/portal/api/router.py` (aggregates all routes)
   - `src/portal/frontend/` (React app — scaffold with Vite)
5. Begin with backend first, frontend second. A working API with a minimal frontend beats a beautiful UI with a broken backend.

---

## 18. THE STAKE

Every line of this portal is about giving power back to the people our system affects. A nurse running a clinic in rural Jharkhand shouldn't have to accept being told by an algorithm that her facility has no ICU when she can see the ventilator in the next room. She should be able to take a photo, submit it, and watch her facility's trust score reflect the truth.

That is what this portal is. Build it like it matters. Because for 700 million people, it does.
