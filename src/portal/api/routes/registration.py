"""Registration and login routes for the Facility Portal."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from src.portal.api.auth import (
    TOKEN_TTL_SECONDS,
    create_access_token,
    hash_password,
    verify_password,
)
from src.portal.api.dependencies import current_user, require_admin
from src.portal.db.gold_reader import facilities, facility_by_id
from src.portal.db.portal_tables import (
    append_record,
    registration_by_id,
    replace_record,
    user_by_email,
)
from src.portal.schemas.portal_schemas import (
    FacilityRegistration,
    LoginRequest,
    PortalUser,
    RegistrationCreate,
    RegistrationCreateResponse,
    RegistrationReviewRequest,
    TokenResponse,
)
from src.portal.services.matcher import match_to_gold

router = APIRouter()
CurrentPortalUser = Annotated[PortalUser, Depends(current_user)]
AdminReviewer = Annotated[str, Depends(require_admin)]


@router.post("/register", response_model=RegistrationCreateResponse)
def register(payload: RegistrationCreate) -> RegistrationCreateResponse:
    if not payload.declaration_confirmed:
        raise HTTPException(status_code=422, detail="Declaration must be confirmed.")
    matched_id, confidence = match_to_gold(
        payload.facility_name,
        payload.address_city,
        payload.address_state_or_region,
        payload.address_zip_or_postcode,
        facilities(),
    )
    registration = FacilityRegistration(
        registration_id=str(uuid4()),
        submitted_at=datetime.now(UTC),
        facility_name=payload.facility_name,
        facility_type=payload.facility_type,
        official_phone=payload.official_phone,
        official_email=payload.official_email,
        official_website=payload.official_website,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        address_city=payload.address_city,
        address_state_or_region=payload.address_state_or_region,
        address_zip_or_postcode=payload.address_zip_or_postcode,
        contact_person_name=payload.contact_person_name,
        contact_person_role=payload.contact_person_role,
        contact_person_phone=payload.contact_person_phone,
        contact_person_email=payload.contact_person_email,
        proof_documents=payload.proof_documents,
        matched_facility_id=matched_id,
        match_confidence=confidence,
    )
    append_record("registrations", registration)
    return RegistrationCreateResponse(
        registration_id=registration.registration_id,
        status=registration.status,
        matched_facility_id=matched_id,
        match_confidence=confidence,
    )


@router.get("/register/{registration_id}", response_model=FacilityRegistration)
def registration_status(registration_id: str) -> FacilityRegistration:
    registration = registration_by_id(registration_id)
    if registration is None:
        raise HTTPException(status_code=404, detail="Registration not found.")
    return registration


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(user_id=user.user_id, facility_id=user.facility_id, role=user.role)
    return TokenResponse(
        access_token=token,
        expires_in_seconds=TOKEN_TTL_SECONDS,
        facility_id=user.facility_id,
        user_id=user.user_id,
        role=user.role,
    )


@router.post("/token/refresh", response_model=TokenResponse)
def refresh_token(user: CurrentPortalUser) -> TokenResponse:
    token = create_access_token(user_id=user.user_id, facility_id=user.facility_id, role=user.role)
    return TokenResponse(
        access_token=token,
        expires_in_seconds=TOKEN_TTL_SECONDS,
        facility_id=user.facility_id,
        user_id=user.user_id,
        role=user.role,
    )


@router.get("/admin/registrations", response_model=list[FacilityRegistration])
def list_registrations(_: AdminReviewer) -> list[FacilityRegistration]:
    from src.portal.db.portal_tables import registrations

    return registrations()


@router.patch("/admin/registrations/{registration_id}", response_model=FacilityRegistration)
def review_registration(
    registration_id: str,
    payload: RegistrationReviewRequest,
    reviewer_id: AdminReviewer,
) -> FacilityRegistration:
    current = registration_by_id(registration_id)
    if current is None:
        raise HTTPException(status_code=404, detail="Registration not found.")
    matched_facility_id = payload.matched_facility_id or current.matched_facility_id
    if payload.status == "approved":
        if matched_facility_id is None or facility_by_id(matched_facility_id) is None:
            raise HTTPException(
                status_code=422,
                detail="Approval requires a valid matched facility.",
            )
        existing_user = user_by_email(current.contact_person_email)
        if existing_user is None:
            password = payload.temporary_password or "PortalDemo123!"
            user = PortalUser(
                user_id=str(uuid4()),
                facility_id=matched_facility_id,
                registration_id=registration_id,
                email=current.contact_person_email,
                password_hash=hash_password(password),
                created_at=datetime.now(UTC),
            )
            append_record("portal_users", user)

    def update(row: FacilityRegistration) -> FacilityRegistration:
        row.status = payload.status
        row.matched_facility_id = matched_facility_id
        row.reviewer_notes = payload.reviewer_notes
        row.reviewed_at = datetime.now(UTC)
        row.reviewed_by = reviewer_id
        if payload.status == "approved":
            created_user = user_by_email(row.contact_person_email)
            row.portal_user_id = created_user.user_id if created_user else row.portal_user_id
            row.portal_access_token_hash = "temporary-password-created"
        return row

    updated = replace_record(
        "registrations",
        FacilityRegistration,
        lambda row: row.registration_id == registration_id,
        update,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Registration not found.")
    return updated
