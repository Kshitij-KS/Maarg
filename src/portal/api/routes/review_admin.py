"""Admin-only portal review helpers."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from src.portal.api.dependencies import require_admin
from src.portal.db.portal_tables import proof_media, proof_media_by_id
from src.portal.schemas.portal_schemas import ProofMedia

router = APIRouter()
AdminReviewer = Annotated[str, Depends(require_admin)]


@router.get("/admin/proof", response_model=list[ProofMedia])
def list_proof_media(_: AdminReviewer) -> list[ProofMedia]:
    return proof_media()


@router.get("/admin/proof/{media_id}", response_model=ProofMedia)
def admin_proof_metadata(media_id: str, _: AdminReviewer) -> ProofMedia:
    media = proof_media_by_id(media_id)
    if media is None:
        raise HTTPException(status_code=404, detail="Proof media not found.")
    return media


@router.get("/admin/proof/{media_id}/file")
def admin_proof_file(media_id: str, _: AdminReviewer) -> dict[str, str]:
    media = proof_media_by_id(media_id)
    if media is None:
        raise HTTPException(status_code=404, detail="Proof media not found.")
    return {
        "media_id": media.media_id,
        "storage_path": media.storage_path,
        "message": "Mock mode stores proof file paths only; fetch from DBFS in real mode.",
    }
