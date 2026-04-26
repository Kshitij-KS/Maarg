from __future__ import annotations

import argparse

from src.trust.pipelines.build_gold_from_bronze import build_facility_trust_records
from src.trust.pipelines.desert_gold import build_pin_desert_records


def build_gold_tables(
    *,
    catalog: str,
    schema: str,
    bronze_table: str,
    facility_gold_table: str,
    desert_gold_table: str,
) -> None:
    spark_session = _spark()
    bronze_name = f"{catalog}.{schema}.{bronze_table}"
    facility_gold_name = f"{catalog}.{schema}.{facility_gold_table}"
    desert_gold_name = f"{catalog}.{schema}.{desert_gold_table}"

    bronze_rows = [
        row.asDict(recursive=True)
        for row in spark_session.table(bronze_name).collect()
    ]
    facility_records = build_facility_trust_records(bronze_rows, skip_invalid=True)
    desert_records = build_pin_desert_records(facility_records)

    spark_session.createDataFrame(facility_records).write.mode("overwrite").format(
        "delta"
    ).saveAsTable(facility_gold_name)
    spark_session.createDataFrame(desert_records).write.mode("overwrite").format(
        "delta"
    ).saveAsTable(desert_gold_name)

    print(
        f"Wrote {len(facility_records)} facility rows and "
        f"{len(desert_records)} desert rows."
    )


def _spark():
    try:
        return spark  # type: ignore[name-defined]  # noqa: F821
    except NameError as exc:
        raise RuntimeError("This script must run inside a Databricks Spark job/notebook.") from exc


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Truth Layer Gold Delta tables.")
    parser.add_argument("--catalog", default="maarg")
    parser.add_argument("--schema", default="truth_layer")
    parser.add_argument("--bronze-table", default="bronze_facilities")
    parser.add_argument("--facility-gold-table", default="gold_facility_trust")
    parser.add_argument("--desert-gold-table", default="gold_pin_desert")
    args = parser.parse_args()
    build_gold_tables(
        catalog=args.catalog,
        schema=args.schema,
        bronze_table=args.bronze_table,
        facility_gold_table=args.facility_gold_table,
        desert_gold_table=args.desert_gold_table,
    )


if __name__ == "__main__":
    main()
