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
          candidates: [],
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
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/query",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
