import { describe, expect, it } from "vitest";

import { haversineKm } from "@/lib/geo";

describe("haversineKm", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineKm(25.921, 86.792, 25.921, 86.792)).toBeLessThan(1e-6);
  });

  it("approximates the Madhepura to Patna distance (~150km)", () => {
    const madhepura = { lat: 25.921, lon: 86.792 };
    const patna = { lat: 25.594, lon: 85.137 };
    const km = haversineKm(madhepura.lat, madhepura.lon, patna.lat, patna.lon);
    expect(km).toBeGreaterThan(140);
    expect(km).toBeLessThan(180);
  });

  it("is symmetric in argument order", () => {
    const ab = haversineKm(25.0, 86.0, 26.0, 87.0);
    const ba = haversineKm(26.0, 87.0, 25.0, 86.0);
    expect(Math.abs(ab - ba)).toBeLessThan(1e-9);
  });
});
