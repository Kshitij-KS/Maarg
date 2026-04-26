"""Pydantic contracts owned by the Facility Portal layer."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

RegistrationStatus = Literal["pending", "under_review", "approved", "rejected", "needs_more_info"]
UpdateStatus = Literal["pending", "under_review", "approved", "rejected", "needs_more_info"]
SessionStatus = Literal["active", "revoked", "expired"]
FieldCategory = Literal[
    "contact",
    "address",
    "profile",
    "operational",
    "clinical",
    "equipment",
    "capability",
]
PortalRole = Literal[
    "org_owner",
    "org_admin",
    "org_editor",
    "org_viewer",
    # Legacy roles are accepted so older demo fixtures can still be loaded.
    "facility_admin",
    "facility_viewer",
]


class Organization(BaseModel):
    """A verified organization that owns one or more facility portal users."""

    organization_id: str
    facility_id: str
    registration_id: str
    name: str
    legal_name: str | None = None
    primary_email: str
    primary_phone: str
    status: Literal["active", "suspended"] = "active"
    created_at: datetime
    approved_at: datetime | None = None
    approved_by: str | None = None


class FacilityRegistration(BaseModel):
    """A hospital or clinic's application to join the portal."""

    registration_id: str
    submitted_at: datetime
    facility_name: str
    facility_type: str
    official_phone: str
    official_email: str
    official_website: str | None = None
    address_line1: str
    address_line2: str | None = None
    address_city: str
    address_state_or_region: str
    address_zip_or_postcode: str
    address_country: str = "India"
    contact_person_name: str
    contact_person_role: str
    contact_person_phone: str
    contact_person_email: str
    proof_documents: list[str] = Field(default_factory=list)
    matched_facility_id: str | None = None
    match_confidence: float | None = Field(default=None, ge=0, le=1)
    status: RegistrationStatus = "pending"
    reviewer_notes: str | None = None
    reviewed_at: datetime | None = None
    reviewed_by: str | None = None
    portal_user_id: str | None = None
    portal_access_token_hash: str | None = None


class RegistrationCreate(BaseModel):
    facility_name: str
    facility_type: str
    official_phone: str
    official_email: str
    official_website: str | None = None
    address_line1: str
    address_line2: str | None = None
    address_city: str
    address_state_or_region: str
    address_zip_or_postcode: str
    contact_person_name: str
    contact_person_role: str
    contact_person_phone: str
    contact_person_email: str
    proof_documents: list[str] = Field(default_factory=list, min_length=1)
    declaration_confirmed: bool


class RegistrationCreateResponse(BaseModel):
    registration_id: str
    status: RegistrationStatus
    matched_facility_id: str | None = None
    match_confidence: float | None = None


class RegistrationReviewRequest(BaseModel):
    status: Literal["approved", "rejected", "needs_more_info", "under_review"]
    matched_facility_id: str | None = None
    reviewer_notes: str | None = None
    temporary_password: str | None = None


class PortalUser(BaseModel):
    """An authenticated facility representative with portal access."""

    user_id: str
    organization_id: str | None = None
    facility_id: str
    registration_id: str
    email: str
    password_hash: str
    created_at: datetime
    last_login: datetime | None = None
    is_active: bool = True
    role: PortalRole = "org_owner"
    display_name: str | None = None
    failed_login_attempts: int = 0
    locked_until: datetime | None = None
    password_changed_at: datetime | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    refresh_expires_in_seconds: int
    facility_id: str
    organization_id: str
    user_id: str
    role: PortalRole
    email: str


class PortalSession(BaseModel):
    session_id: str
    user_id: str
    organization_id: str
    facility_id: str
    created_at: datetime
    expires_at: datetime
    refresh_expires_at: datetime
    status: SessionStatus = "active"
    revoked_at: datetime | None = None
    last_seen_at: datetime | None = None


class PortalMeResponse(BaseModel):
    user: PortalUser
    organization: Organization | None = None


class PortalAuditEvent(BaseModel):
    event_id: str
    event_type: str
    actor_user_id: str | None = None
    actor_role: str | None = None
    organization_id: str | None = None
    facility_id: str | None = None
    target_type: str | None = None
    target_id: str | None = None
    created_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class UpdateRequest(BaseModel):
    """A verified facility's request to update one field in their record."""

    request_id: str
    facility_id: str
    portal_user_id: str
    submitted_at: datetime
    field_name: str
    field_category: FieldCategory
    old_value: str | None = None
    new_value: str
    justification: str
    requires_proof: bool
    proof_media_ids: list[str] = Field(default_factory=list)
    location_verified: bool = False
    proof_location_lat: float | None = None
    proof_location_lon: float | None = None
    proof_location_accuracy_m: float | None = None
    status: UpdateStatus = "pending"
    reviewer_notes: str | None = None
    reviewed_at: datetime | None = None
    reviewed_by: str | None = None
    applied_to_pipeline: bool = False
    applied_at: datetime | None = None
    resulting_extraction_run_id: str | None = None


class UpdateRequestCreate(BaseModel):
    field_name: str
    new_value: Any
    justification: str = Field(..., min_length=5)
    proof_media_ids: list[str] = Field(default_factory=list)
    old_value: Any | None = None


class UpdateFieldMetadata(BaseModel):
    field_name: str
    category: FieldCategory
    requires_proof: bool
    value_type: str
    source_field_name: str
    description: str
    examples: list[str] = Field(default_factory=list)


class UpdateReviewRequest(BaseModel):
    status: Literal["approved", "rejected", "needs_more_info", "under_review"]
    reviewer_notes: str | None = None
    proof_verified: bool = False


class ProofMedia(BaseModel):
    """A photo or document uploaded as proof for an update request."""

    media_id: str
    update_request_id: str | None = None
    facility_id: str
    uploaded_at: datetime
    storage_path: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    location_lat: float | None = None
    location_lon: float | None = None
    location_accuracy_m: float | None = None
    location_captured_at: datetime | None = None
    exif_datetime: datetime | None = None
    exif_gps_lat: float | None = None
    exif_gps_lon: float | None = None
    exif_device_model: str | None = None
    location_discrepancy_detected: bool = False
    timestamp_discrepancy_detected: bool = False
    location_verified: bool = False
    content_verified: bool = False
    reviewer_notes: str | None = None


class ProofUploadCreate(BaseModel):
    update_request_id: str | None = None
    original_filename: str
    mime_type: str
    file_size_bytes: int
    location_lat: float
    location_lon: float
    location_accuracy_m: float
    location_captured_at: datetime


class ApprovedUpdate(BaseModel):
    """Approved update ready for Person A's ingestion pipeline."""

    update_id: str
    facility_id: str
    field_name: str
    new_value: str
    approved_at: datetime
    approved_by: str
    proof_verified: bool
    ingested: bool = False
    ingestion_run_id: str | None = None


class CapabilityDashboardRow(BaseModel):
    capability: str
    label: str
    trust_score_percent: int
    claim_present: bool
    status_label: str
    explanation: str
    citation_sentence: str | None = None
    flags: list[str] = Field(default_factory=list)
    plain_english_flags: list[str] = Field(default_factory=list)


class ImprovementSuggestion(BaseModel):
    severity: Literal["high", "medium", "low"]
    title: str
    description: str
    field_name: str | None = None


class FacilityDashboardResponse(BaseModel):
    facility_id: str
    facility_name: str
    pin_code: str
    state: str
    district: str
    facility_type: str
    last_updated: datetime
    trust_score_percent: int
    capabilities: list[CapabilityDashboardRow]
    update_requests: list[UpdateRequest] = Field(default_factory=list)
    improvement_suggestions: list[ImprovementSuggestion] = Field(default_factory=list)
