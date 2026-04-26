"""Registration and login routes for the Facility Portal."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.portal.api.auth import (
    ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    validate_password_policy,
    verify_password,
)
from app.portal.api.dependencies import current_user, require_admin
from app.portal.db.gold_reader import facilities, facility_by_id
from app.portal.db.portal_tables import (
    append_record,
    organization_by_facility_id,
    organization_by_id,
    registration_by_id,
    replace_record,
    session_by_id,
    user_by_email,
    user_by_id,
)
from app.portal.schemas.portal_schemas import (
    FacilityRegistration,
    LoginRequest,
    Organization,
    PasswordChangeRequest,
    PortalAuditEvent,
    PortalMeResponse,
    PortalSession,
    PortalUser,
    RefreshTokenRequest,
    RegistrationCreate,
    RegistrationCreateResponse,
    RegistrationReviewRequest,
    TokenResponse,
)
from app.portal.services.matcher import match_to_gold

router = APIRouter()
CurrentPortalUser = Annotated[PortalUser, Depends(current_user)]
AdminReviewer = Annotated[str, Depends(require_admin)]


def _audit(
    event_type: str,
    *,
    actor_user_id: str | None = None,
    actor_role: str | None = None,
    organization_id: str | None = None,
    facility_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    metadata: dict[str, object] | None = None,
) -> None:
    append_record(
        "audit_events",
        PortalAuditEvent(
            event_id=str(uuid4()),
            event_type=event_type,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            organization_id=organization_id,
            facility_id=facility_id,
            target_type=target_type,
            target_id=target_id,
            created_at=datetime.now(UTC),
            metadata=metadata or {},
        ),
    )


def _organization_id_for_user(user: PortalUser) -> str:
    return user.organization_id or f"org-{user.facility_id.lower()}"


def _issue_tokens(user: PortalUser) -> TokenResponse:
    now = datetime.now(UTC)
    organization_id = _organization_id_for_user(user)
    session = PortalSession(
        session_id=str(uuid4()),
        user_id=user.user_id,
        organization_id=organization_id,
        facility_id=user.facility_id,
        created_at=now,
        expires_at=now + timedelta(seconds=ACCESS_TOKEN_TTL_SECONDS),
        refresh_expires_at=now + timedelta(seconds=REFRESH_TOKEN_TTL_SECONDS),
    )
    append_record("portal_sessions", session)
    access_token = create_access_token(
        user_id=user.user_id,
        organization_id=organization_id,
        facility_id=user.facility_id,
        role=user.role,
        session_id=session.session_id,
    )
    refresh_token = create_refresh_token(
        user_id=user.user_id,
        organization_id=organization_id,
        facility_id=user.facility_id,
        role=user.role,
        session_id=session.session_id,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in_seconds=ACCESS_TOKEN_TTL_SECONDS,
        refresh_expires_in_seconds=REFRESH_TOKEN_TTL_SECONDS,
        facility_id=user.facility_id,
        organization_id=organization_id,
        user_id=user.user_id,
        role=user.role,
        email=user.email,
    )


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
    _audit(
        "registration.submitted",
        facility_id=matched_id,
        target_type="registration",
        target_id=registration.registration_id,
        metadata={"email": payload.contact_person_email, "match_confidence": confidence},
    )
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
        if user is not None:
            def mark_failed(row: PortalUser) -> PortalUser:
                row.failed_login_attempts += 1
                if row.failed_login_attempts >= 5:
                    row.locked_until = datetime.now(UTC) + timedelta(minutes=15)
                return row

            replace_record(
                "portal_users",
                PortalUser,
                lambda row: row.user_id == user.user_id,
                mark_failed,
            )
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user.locked_until and user.locked_until > datetime.now(UTC):
        raise HTTPException(status_code=423, detail="Portal account is temporarily locked.")

    def mark_login(row: PortalUser) -> PortalUser:
        row.last_login = datetime.now(UTC)
        row.failed_login_attempts = 0
        return row

    updated_user = replace_record(
        "portal_users",
        PortalUser,
        lambda row: row.user_id == user.user_id,
        mark_login,
    )
    user = updated_user or user
    _audit(
        "auth.login",
        actor_user_id=user.user_id,
        actor_role=user.role,
        organization_id=user.organization_id,
        facility_id=user.facility_id,
    )
    return _issue_tokens(user)


@router.get("/me", response_model=PortalMeResponse)
def me(user: CurrentPortalUser) -> PortalMeResponse:
    organization = organization_by_id(user.organization_id) if user.organization_id else None
    return PortalMeResponse(user=user, organization=organization)


@router.post("/logout")
def logout(payload: RefreshTokenRequest) -> dict[str, bool]:
    try:
        token_payload = decode_access_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    session_id = str(token_payload.get("session_id", ""))

    def revoke(row: PortalSession) -> PortalSession:
        row.status = "revoked"
        row.revoked_at = datetime.now(UTC)
        return row

    replace_record(
        "portal_sessions",
        PortalSession,
        lambda row: row.session_id == session_id,
        revoke,
    )
    return {"ok": True}


@router.post("/token/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest) -> TokenResponse:
    try:
        token_payload = decode_access_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    if token_payload.get("token_use") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token required.")
    session = session_by_id(str(token_payload.get("session_id", "")))
    if session is None or session.status != "active":
        raise HTTPException(status_code=401, detail="Portal session is not active.")
    if session.refresh_expires_at < datetime.now(UTC):
        raise HTTPException(status_code=401, detail="Refresh session has expired.")
    portal_user = user_by_id(session.user_id)
    if portal_user is None or not portal_user.is_active:
        raise HTTPException(status_code=401, detail="Portal user not found or inactive.")
    return _issue_tokens(portal_user)


@router.post("/password/change")
def change_password(payload: PasswordChangeRequest, user: CurrentPortalUser) -> dict[str, bool]:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    try:
        validate_password_policy(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    def update_password(row: PortalUser) -> PortalUser:
        row.password_hash = hash_password(payload.new_password)
        row.password_changed_at = datetime.now(UTC)
        return row

    replace_record(
        "portal_users",
        PortalUser,
        lambda row: row.user_id == user.user_id,
        update_password,
    )
    _audit(
        "auth.password_changed",
        actor_user_id=user.user_id,
        actor_role=user.role,
        organization_id=user.organization_id,
        facility_id=user.facility_id,
    )
    return {"ok": True}


@router.get("/admin/registrations", response_model=list[FacilityRegistration])
def list_registrations(_: AdminReviewer) -> list[FacilityRegistration]:
    from app.portal.db.portal_tables import registrations

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
    reviewed_organization_id: str | None = None
    if payload.status == "approved":
        if matched_facility_id is None or facility_by_id(matched_facility_id) is None:
            raise HTTPException(
                status_code=422,
                detail="Approval requires a valid matched facility.",
            )
        existing_user = user_by_email(current.contact_person_email)
        organization = organization_by_facility_id(matched_facility_id)
        if organization is None:
            organization = Organization(
                organization_id=str(uuid4()),
                facility_id=matched_facility_id,
                registration_id=registration_id,
                name=current.facility_name,
                legal_name=current.facility_name,
                primary_email=current.contact_person_email,
                primary_phone=current.contact_person_phone,
                created_at=datetime.now(UTC),
                approved_at=datetime.now(UTC),
                approved_by=reviewer_id,
            )
            append_record("organizations", organization)
        reviewed_organization_id = organization.organization_id
        if existing_user is None:
            password = payload.temporary_password or "PortalDemo123!"
            try:
                validate_password_policy(password)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
            user = PortalUser(
                user_id=str(uuid4()),
                organization_id=organization.organization_id,
                facility_id=matched_facility_id,
                registration_id=registration_id,
                email=current.contact_person_email,
                password_hash=hash_password(password),
                created_at=datetime.now(UTC),
                role="org_owner",
                display_name=current.contact_person_name,
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
    _audit(
        "registration.reviewed",
        actor_role=reviewer_id,
        organization_id=reviewed_organization_id,
        facility_id=matched_facility_id,
        target_type="registration",
        target_id=registration_id,
        metadata={"status": payload.status},
    )
    return updated
