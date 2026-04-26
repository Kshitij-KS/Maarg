import { beforeEach, describe, expect, it } from "vitest";

import {
  FILTERS_INITIAL,
  selectFilterPayload,
  useFiltersStore,
} from "@/lib/stores/use-filters-store";
import { CAPABILITIES, CAPABILITY_LABELS } from "@/lib/types";

beforeEach(() => {
  useFiltersStore.setState({ ...FILTERS_INITIAL });
});

describe("useFiltersStore", () => {
  it("toggleCapability adds and then removes the same capability", () => {
    const { toggleCapability } = useFiltersStore.getState();

    toggleCapability("dialysis");
    expect(useFiltersStore.getState().capabilities).toEqual(["dialysis"]);

    toggleCapability("dialysis");
    expect(useFiltersStore.getState().capabilities).toEqual([]);
  });

  it("applyNow copies query into appliedQuery without mutating other fields", () => {
    const { setQuery, applyNow } = useFiltersStore.getState();

    setQuery("dialysis at F00042");
    expect(useFiltersStore.getState().appliedQuery).toBe("");

    applyNow();
    expect(useFiltersStore.getState().appliedQuery).toBe("dialysis at F00042");
    expect(useFiltersStore.getState().query).toBe("dialysis at F00042");
  });

  it("clearing the query also clears appliedQuery", () => {
    const { setQuery, applyNow } = useFiltersStore.getState();

    setQuery("dialysis at F00042");
    applyNow();
    expect(useFiltersStore.getState().appliedQuery).toBe("dialysis at F00042");

    setQuery("");
    expect(useFiltersStore.getState().query).toBe("");
    expect(useFiltersStore.getState().appliedQuery).toBe("");
  });

  it("hydrateFromScenario writes both query and appliedQuery atomically", () => {
    const { hydrateFromScenario } = useFiltersStore.getState();

    hydrateFromScenario({
      text: "Emergency C-section",
      user_lat: 25.92,
      user_lon: 86.79,
      max_distance_km: 75,
      min_trust_score: 0.6,
      capabilities_filter: ["c_section"],
    });

    const state = useFiltersStore.getState();
    expect(state.query).toBe("Emergency C-section");
    expect(state.appliedQuery).toBe("Emergency C-section");
    expect(state.userLat).toBe(25.92);
    expect(state.userLon).toBe(86.79);
    expect(state.maxDistanceKm).toBe(75);
    expect(state.minTrust).toBe(0.6);
    expect(state.capabilities).toEqual(["c_section"]);
  });

  it("supports Truth Layer P0 capability labels without raw snake_case fallback", () => {
    expect(CAPABILITIES).toEqual(
      expect.arrayContaining([
        "advanced_surgery",
        "emergency_obstetric_care",
        "neonatal_icu",
        "dialysis",
        "emergency_trauma",
      ]),
    );
    expect(CAPABILITY_LABELS.advanced_surgery).toBe("Advanced Surgery");
    expect(CAPABILITY_LABELS.neonatal_icu).toBe("Neonatal ICU");
    expect(CAPABILITY_LABELS.emergency_trauma).toBe("Emergency Trauma");
  });

  it("selectFilterPayload returns exactly four facet keys", () => {
    useFiltersStore.setState({
      ...FILTERS_INITIAL,
      appliedQuery: "test",
      capabilities: ["icu"],
      maxDistanceKm: 25,
      minTrust: 0.7,
      userLat: 25.0,
      userLon: 86.0,
    });

    const payload = selectFilterPayload(useFiltersStore.getState());
    expect(Object.keys(payload).sort()).toEqual(
      ["capabilities", "maxDistanceKm", "minTrust", "text"].sort(),
    );
    expect(payload).toEqual({
      text: "test",
      capabilities: ["icu"],
      maxDistanceKm: 25,
      minTrust: 0.7,
    });
  });
});
