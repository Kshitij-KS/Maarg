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
