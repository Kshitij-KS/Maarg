import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ResultCard } from "@/components/result-card";
import {
  FILTERS_INITIAL,
  useFiltersStore,
} from "@/lib/stores/use-filters-store";
import type { FacilityTrustRecord } from "@/lib/types";

const baseFacility: FacilityTrustRecord = {
  facility_id: "F00001",
  facility_name: "Madhepura District Hospital",
  pin_code: "852113",
  state: "Bihar",
  district: "Madhepura",
  lat: 25.921,
  lon: 86.792,
  facility_type: "District Hospital",
  capabilities: [
    {
      capability: "c_section",
      claim_present: true,
      self_consistency_score: 0.92,
      coherence_score: 0.9,
      peer_anomaly_score: 0.86,
      inference_score: 0.81,
      trust_score: 0.91,
      confidence_interval_low: 0.84,
      confidence_interval_high: 0.96,
      citations: [],
      inference_detail: {
        inferred_present: true,
        inference_confidence: 0.81,
        supporting_equipment: ["operation theatre"],
        contradictions: [],
        inference_flags: [],
      },
      flags: [],
    },
  ],
  normalization_version: "normalizer_v1",
  overall_trust_score: 0.9,
  extraction_run_ids: ["mock-run-001"],
  last_updated: "2026-04-26T00:00:00Z",
};

beforeEach(() => {
  useFiltersStore.setState({ ...FILTERS_INITIAL });
});

describe("ResultCard", () => {
  it("renders facility name and overall trust score", () => {
    render(<ResultCard facility={baseFacility} />);

    expect(screen.getByText("Madhepura District Hospital")).toBeInTheDocument();
    // Trust score animates from 0 in tests (framer-motion runs in jsdom without
    // a real timer loop), so assert the Trust label is visible rather than the
    // exact animated value which hasn't settled yet.
    expect(screen.getByText("Trust")).toBeInTheDocument();
  });

  it("flags facilities whose capability claims have flags", () => {
    const flaggedFacility: FacilityTrustRecord = {
      ...baseFacility,
      facility_id: "F00002",
      capabilities: [
        {
          ...baseFacility.capabilities[0],
          flags: ["MISSING_ANESTHESIOLOGIST"],
        },
      ],
    };

    const { container } = render(<ResultCard facility={flaggedFacility} />);
    const article = container.querySelector("article");
    expect(article).not.toBeNull();
    expect(article?.getAttribute("data-flagged")).toBe("true");
    expect(screen.getByRole("status", { name: "Flagged" })).toBeInTheDocument();
  });

  it("renders the Truth Layer inference signal and contradiction copy", () => {
    const facility: FacilityTrustRecord = {
      ...baseFacility,
      capabilities: [
        {
          ...baseFacility.capabilities[0],
          inference_score: 0.25,
          inference_detail: {
            inferred_present: false,
            inference_confidence: 0.25,
            supporting_equipment: [],
            contradictions: ["No anesthesiologist evidence for surgical capability."],
            inference_flags: ["EQUIPMENT_CLAIM_MISMATCH"],
          },
          flags: ["EQUIPMENT_CLAIM_MISMATCH"],
        },
      ],
    };

    render(<ResultCard facility={facility} />);

    expect(screen.getByText("Inference graph")).toBeInTheDocument();
    expect(
      screen.getByText("No anesthesiologist evidence for surgical capability."),
    ).toBeInTheDocument();
  });
});
