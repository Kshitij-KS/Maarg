import { describe, expect, it } from "vitest";

import { desertMarkerKey } from "@/lib/map-markers";
import type { PinCodeDesert } from "@/lib/types";

const desert: PinCodeDesert = {
  pin_code: "852113",
  state: "Bihar",
  district: "Madhepura",
  lat: 25.92,
  lon: 86.79,
  population: 184900,
  capability: "emergency_obstetric_care",
  nearest_verified_facility_id: "F00001",
  distance_km: 0,
  desert_score: 0.2,
};

describe("desertMarkerKey", () => {
  it("keeps duplicate pin/capability rows unique for React markers", () => {
    expect(desertMarkerKey(desert, 0)).not.toBe(
      desertMarkerKey({ ...desert, population: 65000 }, 1),
    );
  });
});
