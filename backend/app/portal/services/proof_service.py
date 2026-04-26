"""Proof media storage and metadata helpers."""

from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.portal.db import portal_tables
from app.portal.schemas.portal_schemas import ProofMedia, ProofUploadCreate


def make_storage_path(facility_id: str, media_id: str, filename: str) -> str:
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"dbfs:/portal/proof_photos/{facility_id}/{media_id}.{suffix}"


def mock_storage_path(facility_id: str, media_id: str, filename: str) -> Path:
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return portal_tables.PORTAL_FIXTURES_DIR / "proof_files" / facility_id / f"{media_id}.{suffix}"


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_m = 6_371_000
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    )
    return 2 * radius_m * asin(sqrt(a))


def _gps_to_decimal(value: Any, ref: str) -> float | None:
    try:
        degrees, minutes, seconds = value
        decimal = float(degrees) + (float(minutes) / 60) + (float(seconds) / 3600)
    except (TypeError, ValueError):
        return None
    return -decimal if ref in {"S", "W"} else decimal


def extract_exif(image_bytes: bytes) -> dict[str, Any]:
    """Extract EXIF metadata when Pillow is available and the file is an image."""

    try:
        from PIL import ExifTags, Image
    except ImportError:
        return {}

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            raw_exif = image.getexif()
            if not raw_exif:
                return {}
            named = {ExifTags.TAGS.get(key, key): value for key, value in raw_exif.items()}
            gps_raw = named.get("GPSInfo") or {}
            gps = {
                ExifTags.GPSTAGS.get(key, key): value
                for key, value in getattr(gps_raw, "items", lambda: [])()
            }
    except Exception:
        return {}

    exif_datetime: datetime | None = None
    raw_datetime = named.get("DateTimeOriginal") or named.get("DateTime")
    if isinstance(raw_datetime, str):
        try:
            exif_datetime = datetime.strptime(raw_datetime, "%Y:%m:%d %H:%M:%S").replace(
                tzinfo=UTC
            )
        except ValueError:
            exif_datetime = None

    gps_lat = _gps_to_decimal(gps.get("GPSLatitude"), str(gps.get("GPSLatitudeRef", "")))
    gps_lon = _gps_to_decimal(gps.get("GPSLongitude"), str(gps.get("GPSLongitudeRef", "")))
    return {
        "exif_datetime": exif_datetime,
        "exif_gps_lat": gps_lat,
        "exif_gps_lon": gps_lon,
        "exif_device_model": named.get("Model") if isinstance(named.get("Model"), str) else None,
    }


def create_proof_media(
    facility_id: str,
    payload: ProofUploadCreate,
    file_bytes: bytes | None = None,
) -> ProofMedia:
    media_id = str(uuid4())
    storage_path = make_storage_path(facility_id, media_id, payload.original_filename)
    exif = extract_exif(file_bytes or b"")
    if file_bytes is not None:
        local_path = mock_storage_path(facility_id, media_id, payload.original_filename)
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(file_bytes)

    exif_lat = exif.get("exif_gps_lat")
    exif_lon = exif.get("exif_gps_lon")
    location_discrepancy = False
    if isinstance(exif_lat, float) and isinstance(exif_lon, float):
        location_discrepancy = (
            _haversine_m(payload.location_lat, payload.location_lon, exif_lat, exif_lon) > 500
        )

    exif_datetime = exif.get("exif_datetime")
    exif_device_model = exif.get("exif_device_model")
    timestamp_discrepancy = False
    if isinstance(exif_datetime, datetime):
        timestamp_discrepancy = (
            abs((payload.location_captured_at - exif_datetime).total_seconds()) > 300
        )

    return ProofMedia(
        media_id=media_id,
        update_request_id=payload.update_request_id,
        facility_id=facility_id,
        uploaded_at=datetime.now(UTC),
        storage_path=storage_path,
        original_filename=payload.original_filename,
        mime_type=payload.mime_type,
        file_size_bytes=payload.file_size_bytes,
        location_lat=payload.location_lat,
        location_lon=payload.location_lon,
        location_accuracy_m=payload.location_accuracy_m,
        location_captured_at=payload.location_captured_at,
        exif_datetime=exif_datetime if isinstance(exif_datetime, datetime) else None,
        exif_gps_lat=exif_lat if isinstance(exif_lat, float) else None,
        exif_gps_lon=exif_lon if isinstance(exif_lon, float) else None,
        exif_device_model=exif_device_model if isinstance(exif_device_model, str) else None,
        location_discrepancy_detected=location_discrepancy,
        timestamp_discrepancy_detected=timestamp_discrepancy,
    )
