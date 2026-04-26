CREATE CATALOG IF NOT EXISTS maarg;
CREATE SCHEMA IF NOT EXISTS maarg.truth_layer;
CREATE VOLUME IF NOT EXISTS maarg.truth_layer.raw_uploads;

CREATE TABLE IF NOT EXISTS maarg.truth_layer.bronze_facilities
USING DELTA
AS
SELECT *
FROM read_files(
  '/Volumes/maarg/truth_layer/raw_uploads/vf_hackathon_dataset_india_large.csv',
  format => 'csv',
  header => true,
  inferSchema => true,
  multiLine => true,
  escape => '"'
);

CREATE TABLE IF NOT EXISTS maarg.truth_layer.gold_facility_trust (
  facility_id STRING NOT NULL,
  facility_name STRING NOT NULL,
  pin_code STRING NOT NULL,
  state STRING NOT NULL,
  district STRING NOT NULL,
  lat DOUBLE NOT NULL,
  lon DOUBLE NOT NULL,
  facility_type STRING NOT NULL,
  normalization_version STRING NOT NULL,
  capabilities ARRAY<STRUCT<
    capability: STRING,
    claim_present: BOOLEAN,
    self_consistency_score: DOUBLE,
    coherence_score: DOUBLE,
    peer_anomaly_score: DOUBLE,
    inference_score: DOUBLE,
    trust_score: DOUBLE,
    confidence_interval_low: DOUBLE,
    confidence_interval_high: DOUBLE,
    citations: ARRAY<STRUCT<source_field: STRING, sentence: STRING, char_start: BIGINT, char_end: BIGINT>>,
    inference_detail: STRUCT<
      inferred_present: BOOLEAN,
      inference_confidence: DOUBLE,
      supporting_equipment: ARRAY<STRING>,
      contradictions: ARRAY<STRING>,
      inference_flags: ARRAY<STRING>
    >,
    flags: ARRAY<STRING>
  >>,
  overall_trust_score DOUBLE NOT NULL,
  extraction_run_ids ARRAY<STRING>,
  last_updated TIMESTAMP NOT NULL
)
USING DELTA;

CREATE TABLE IF NOT EXISTS maarg.truth_layer.gold_pin_desert (
  pin_code STRING NOT NULL,
  state STRING NOT NULL,
  district STRING NOT NULL,
  lat DOUBLE NOT NULL,
  lon DOUBLE NOT NULL,
  population BIGINT,
  capability STRING NOT NULL,
  nearest_verified_facility_id STRING,
  distance_km DOUBLE,
  desert_score DOUBLE NOT NULL
)
USING DELTA;
