import { afterEach, describe, expect, it, vi } from "vitest";

import { queryFacilities } from "@/lib/api";

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts QueryRequest and validates QueryResponse", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          query: "test",
          candidates: [
            {
              facility_id: "F00001",
              facility_name: "Madhepura District Hospital",
              pin_code: "852113",
              state: "Bihar",
              district: "Madhepura",
              lat: 25.921,
              lon: 86.792,
              facility_type: "District Hospital",
              normalization_version: "normalizer_v1",
              capabilities: [
                {
                  capability: "emergency_obstetric_care",
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
              overall_trust_score: 0.9,
              extraction_run_ids: ["mock-run-001"],
              last_updated: "2026-04-26T00:00:00Z",
            },
          ],
          citations_per_candidate: {},
          critic_verdict: "supported",
          critic_reasoning: "ok",
          trace_id: "tr-test",
        }),
        { status: 200, statusText: "OK" },
      ),
    );

    const response = await queryFacilities({ text: "test", min_trust_score: 0.5, top_k: 10 });

    expect(response.trace_id).toBe("tr-test");
    expect(response.candidates[0].normalization_version).toBe("normalizer_v1");
    expect(response.candidates[0].capabilities[0].inference_score).toBe(0.81);
    expect(response.candidates[0].capabilities[0].inference_detail).toEqual(
      expect.objectContaining({ supporting_equipment: ["operation theatre"] }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/query",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws a user-friendly error when the response shape is wrong", async () => {
    // Suppress the dev console.error inside parseJson so the test output stays clean.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ unexpected: "shape" }), {
        status: 200,
        statusText: "OK",
      }),
    );

    await expect(
      queryFacilities({ text: "test", min_trust_score: 0.5, top_k: 10 }),
    ).rejects.toThrow(/Backend response shape changed/i);

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("converts fetch AbortError into a friendly timeout message", async () => {
    const abortErr =
      typeof DOMException !== "undefined"
        ? new DOMException("aborted", "AbortError")
        : Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(abortErr);

    await expect(
      queryFacilities({ text: "test", min_trust_score: 0.5, top_k: 10 }),
    ).rejects.toThrow(/Request timed out/i);
  });
});
