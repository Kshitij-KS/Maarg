# Dataset Handling

## Canonical Local Input

Use the CSV file at the repository root as the operational input:

```text
VF_Hackathon_Dataset_India_Large.xlsx - VF_Hackathon_Dataset_India_Larg.csv
```

The original source was provided as an Excel sheet, but the pipeline should ingest CSV for speed and Databricks compatibility.

## Key Columns

The current CSV includes the fields needed for the Truth Layer:

- Facility identity: `name`, `phone_numbers`, `email`, `websites`
- Location: `address_city`, `address_stateOrRegion`, `address_zipOrPostcode`, `latitude`, `longitude`
- Facility metadata: `facilityTypeId`, `operatorTypeId`, `description`, `numberDoctors`, `capacity`
- Medical evidence: `specialties`, `procedure`, `equipment`, `capability`

## Local Ingestion Convention

`src/trust/pipelines/01_load_bronze.py` should read from:

```text
FACILITY_CSV_PATH
```

and default to:

```text
VF_Hackathon_Dataset_India_Large.xlsx - VF_Hackathon_Dataset_India_Larg.csv
```

## Databricks Convention

When moving to Databricks, upload the same CSV to a Unity Catalog Volume and override `FACILITY_CSV_PATH`, for example:

```text
/Volumes/main/bronze/raw/facilities_raw.csv
```

The Bronze loader should then write to:

```text
main.bronze.facilities
```

Do not commit raw dataset files. They are ignored by `.gitignore`.
