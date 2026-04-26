from __future__ import annotations

import argparse
import csv
import subprocess
from pathlib import Path


REQUIRED_COLUMNS = {
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
}


def validate_csv_header(csv_path: Path) -> None:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = set(reader.fieldnames or [])
    missing = sorted(REQUIRED_COLUMNS - headers)
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(missing)}")


def upload_csv(
    *,
    csv_path: Path,
    profile: str,
    catalog: str,
    schema: str,
    volume: str,
    remote_name: str,
    dry_run: bool,
) -> str:
    validate_csv_header(csv_path)
    destination = f"dbfs:/Volumes/{catalog}/{schema}/{volume}/{remote_name}"
    command = [
        "databricks",
        "fs",
        "cp",
        str(csv_path),
        destination,
        "--overwrite",
        "--profile",
        profile,
    ]
    if dry_run:
        return " ".join(command)
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr or exc.stdout or str(exc)
        if "no such directory" in stderr and f"/Volumes/{catalog}/{schema}/{volume}" in stderr:
            raise RuntimeError(
                "Create the Unity Catalog volume first, then rerun upload. "
                "In Databricks SQL, run: "
                f"CREATE CATALOG IF NOT EXISTS {catalog}; "
                f"CREATE SCHEMA IF NOT EXISTS {catalog}.{schema}; "
                f"CREATE VOLUME IF NOT EXISTS {catalog}.{schema}.{volume};"
            ) from exc
        raise RuntimeError(f"Databricks upload failed: {stderr}") from exc
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload Truth Layer CSV to a UC Volume.")
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--catalog", default="maarg")
    parser.add_argument("--schema", default="truth_layer")
    parser.add_argument("--volume", default="raw_uploads")
    parser.add_argument("--remote-name", default="vf_hackathon_dataset_india_large.csv")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    result = upload_csv(
        csv_path=args.csv_path,
        profile=args.profile,
        catalog=args.catalog,
        schema=args.schema,
        volume=args.volume,
        remote_name=args.remote_name,
        dry_run=args.dry_run,
    )
    print(result)


if __name__ == "__main__":
    main()
