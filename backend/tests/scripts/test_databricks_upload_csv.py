from __future__ import annotations

import csv
import subprocess

import pytest

from scripts.databricks_upload_csv import upload_csv, validate_csv_header

CSV_HEADERS = [
    "name",
    "address_city",
    "address_stateOrRegion",
    "address_zipOrPostcode",
    "facilityTypeId",
    "description",
    "specialties",
    "procedure",
    "equipment",
    "capability",
    "latitude",
    "longitude",
]


def test_upload_csv_dry_run_validates_and_returns_cli_command(tmp_path) -> None:
    csv_path = tmp_path / "facilities.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerow({header: "value" for header in CSV_HEADERS})

    command = upload_csv(
        csv_path=csv_path,
        profile="hackathon",
        catalog="maarg",
        schema="truth_layer",
        volume="raw_uploads",
        remote_name="facilities.csv",
        dry_run=True,
    )

    assert "databricks fs cp" in command
    assert "dbfs:/Volumes/maarg/truth_layer/raw_uploads/facilities.csv" in command
    assert "--profile hackathon" in command


def test_validate_csv_header_reports_missing_columns(tmp_path) -> None:
    csv_path = tmp_path / "bad.csv"
    csv_path.write_text("name,latitude,longitude\nHospital,1,2\n", encoding="utf-8")

    with pytest.raises(ValueError, match="address_city"):
        validate_csv_header(csv_path)


def test_upload_csv_explains_missing_uc_volume(tmp_path, monkeypatch) -> None:
    csv_path = tmp_path / "facilities.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerow({header: "value" for header in CSV_HEADERS})

    def fail_run(*args, **kwargs):
        raise subprocess.CalledProcessError(
            returncode=1,
            cmd=args[0],
            stderr="Error: no such directory: /Volumes/maarg/truth_layer/raw_uploads",
        )

    monkeypatch.setattr(subprocess, "run", fail_run)

    with pytest.raises(RuntimeError, match="Create the Unity Catalog volume first"):
        upload_csv(
            csv_path=csv_path,
            profile="hackathon",
            catalog="maarg",
            schema="truth_layer",
            volume="raw_uploads",
            remote_name="facilities.csv",
            dry_run=False,
        )
