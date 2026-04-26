"""Proof media metadata routes."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from src.portal.api.dependencies import current_user
from src.portal.db.portal_tables import append_record, proof_media_by_id
from src.portal.schemas.portal_schemas import PortalUser, ProofMedia, ProofUploadCreate
from src.portal.services.proof_service import create_proof_media

router = APIRouter()
CurrentPortalUser = Annotated[PortalUser, Depends(current_user)]
ProofFile = Annotated[UploadFile, File()]
OptionalRequestId = Annotated[str | None, Form()]
LocationLat = Annotated[float, Form()]
LocationLon = Annotated[float, Form()]
LocationAccuracy = Annotated[float, Form()]
CapturedAt = Annotated[datetime, Form()]


@router.post("/proof/upload", response_model=ProofMedia)
async def upload_proof(
    user: CurrentPortalUser,
    file: ProofFile,
    location_lat: LocationLat,
    location_lon: LocationLon,
    location_accuracy_m: LocationAccuracy,
    location_captured_at: CapturedAt,
    update_request_id: OptionalRequestId = None,
) -> ProofMedia:
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=422, detail="Proof file is empty.")
    mime_type = file.content_type or "application/octet-stream"
    if not (mime_type.startswith("image/") or mime_type == "application/pdf"):
        raise HTTPException(status_code=422, detail="Proof must be an image or PDF.")
    payload = ProofUploadCreate(
        update_request_id=update_request_id,
        original_filename=file.filename or "proof-upload",
        mime_type=mime_type,
        file_size_bytes=len(file_bytes),
        location_lat=location_lat,
        location_lon=location_lon,
        location_accuracy_m=location_accuracy_m,
        location_captured_at=location_captured_at,
    )
    media = create_proof_media(user.facility_id, payload, file_bytes)
    append_record("proof_media", media)
    return media


@router.get("/proof/{media_id}", response_model=ProofMedia)
def proof_metadata(media_id: str, user: CurrentPortalUser) -> ProofMedia:
    media = proof_media_by_id(media_id)
    if media is None or media.facility_id != user.facility_id:
        raise HTTPException(status_code=404, detail="Proof media not found.")
    return media
