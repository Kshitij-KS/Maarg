"""Facility update request and admin review routes."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.portal.api.dependencies import current_user, require_admin, require_org_editor
from app.portal.db.gold_reader import facility_by_id
from app.portal.db.portal_tables import (
    append_record,
    approved_updates,
    proof_media_by_id,
    replace_record,
    update_request_by_id,
    update_requests,
)
from app.portal.schemas.portal_schemas import (
    ApprovedUpdate,
    PortalAuditEvent,
    PortalUser,
    UpdateFieldMetadata,
    UpdateRequest,
    UpdateRequestCreate,
    UpdateReviewRequest,
)
from app.portal.services.update_service import (
    allowed_field_metadata,
    field_policy,
    serialize_update_value,
    validate_update_value,
)

router = APIRouter()
CurrentPortalUser = Annotated[PortalUser, Depends(current_user)]
OrgEditor = Annotated[PortalUser, Depends(require_org_editor)]
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


@router.get("/updates/fields", response_model=list[UpdateFieldMetadata])
def list_update_fields(_: CurrentPortalUser) -> list[UpdateFieldMetadata]:
    return [
        UpdateFieldMetadata(field_name=field_name, **policy)
        for field_name, policy in (
            (policy["source_field_name"], policy) for policy in allowed_field_metadata()
        )
    ]


@router.post("/updates", response_model=UpdateRequest)
def create_update_request(
    payload: UpdateRequestCreate,
    user: OrgEditor,
) -> UpdateRequest:
    record = facility_by_id(user.facility_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Linked Gold facility not found.")
    try:
        policy = validate_update_value(
            payload.field_name,
            payload.new_value,
            payload.proof_media_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    for media_id in payload.proof_media_ids:
        media = proof_media_by_id(media_id)
        if media is None or media.facility_id != user.facility_id:
            raise HTTPException(status_code=422, detail=f"Invalid proof media id: {media_id}")
    request = UpdateRequest(
        request_id=str(uuid4()),
        facility_id=user.facility_id,
        portal_user_id=user.user_id,
        submitted_at=datetime.now(UTC),
        field_name=payload.field_name,
        field_category=policy["category"],
        old_value=(
            serialize_update_value(payload.old_value) if payload.old_value is not None else None
        ),
        new_value=serialize_update_value(payload.new_value),
        justification=payload.justification,
        requires_proof=policy["requires_proof"],
        proof_media_ids=payload.proof_media_ids,
    )
    append_record("update_requests", request)
    _audit(
        "update.submitted",
        actor_user_id=user.user_id,
        actor_role=user.role,
        organization_id=user.organization_id,
        facility_id=user.facility_id,
        target_type="update_request",
        target_id=request.request_id,
        metadata={"field_name": payload.field_name, "requires_proof": policy["requires_proof"]},
    )
    return request


@router.get("/updates", response_model=list[UpdateRequest])
def list_update_requests(user: CurrentPortalUser) -> list[UpdateRequest]:
    return [request for request in update_requests() if request.facility_id == user.facility_id]


@router.get("/updates/{request_id}", response_model=UpdateRequest)
def get_update_request(
    request_id: str,
    user: CurrentPortalUser,
) -> UpdateRequest:
    request = update_request_by_id(request_id)
    if request is None or request.facility_id != user.facility_id:
        raise HTTPException(status_code=404, detail="Update request not found.")
    return request


@router.get("/admin/updates", response_model=list[UpdateRequest])
def list_admin_updates(_: AdminReviewer) -> list[UpdateRequest]:
    return update_requests()


@router.patch("/admin/updates/{request_id}", response_model=UpdateRequest)
def review_update_request(
    request_id: str,
    payload: UpdateReviewRequest,
    reviewer_id: AdminReviewer,
) -> UpdateRequest:
    existing = update_request_by_id(request_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Update request not found.")
    if payload.status == "approved" and existing.requires_proof and not payload.proof_verified:
        raise HTTPException(
            status_code=422,
            detail="Proof-required updates must be verified before approval.",
        )

    def update(row: UpdateRequest) -> UpdateRequest:
        row.status = payload.status
        row.reviewer_notes = payload.reviewer_notes
        row.reviewed_at = datetime.now(UTC)
        row.reviewed_by = reviewer_id
        if payload.status == "approved":
            row.applied_to_pipeline = False
        return row

    updated = replace_record(
        "update_requests",
        UpdateRequest,
        lambda row: row.request_id == request_id,
        update,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Update request not found.")
    _audit(
        "update.reviewed",
        actor_role=reviewer_id,
        facility_id=updated.facility_id,
        target_type="update_request",
        target_id=request_id,
        metadata={"status": payload.status, "proof_verified": payload.proof_verified},
    )
    already_queued = any(row.update_id == updated.request_id for row in approved_updates())
    if payload.status == "approved" and not already_queued:
        policy = field_policy(updated.field_name)
        approved = ApprovedUpdate(
            update_id=updated.request_id,
            facility_id=updated.facility_id,
            field_name=policy["source_field_name"],
            new_value=updated.new_value,
            approved_at=datetime.now(UTC),
            approved_by=reviewer_id,
            proof_verified=payload.proof_verified or not updated.requires_proof,
        )
        append_record("approved_updates", approved)
    return updated
