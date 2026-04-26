import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { Capability, QueryRequest } from "@/lib/types";

export type FiltersState = {
  query: string;
  appliedQuery: string;
  capabilities: Capability[];
  maxDistanceKm: number;
  minTrust: number;
  userLat: number | null;
  userLon: number | null;
  setQuery: (q: string) => void;
  applyNow: () => void;
  toggleCapability: (capability: Capability) => void;
  setMaxDistanceKm: (km: number) => void;
  setMinTrust: (n: number) => void;
  setUserCoords: (lat: number | null, lon: number | null) => void;
  hydrateFromScenario: (req: Partial<QueryRequest>) => void;
  reset: () => void;
};

export const FILTERS_INITIAL = {
  query: "",
  appliedQuery: "",
  capabilities: [] as Capability[],
  maxDistanceKm: 50,
  minTrust: 0.5,
  userLat: null as number | null,
  userLon: null as number | null,
};

export const useFiltersStore = create<FiltersState>()(
  devtools(
    (set) => ({
      ...FILTERS_INITIAL,
      setQuery: (q) =>
        set(
          q.length === 0 ? { query: q, appliedQuery: "" } : { query: q },
          false,
          "filters/setQuery",
        ),
      applyNow: () =>
        set(
          (state) => ({ appliedQuery: state.query }),
          false,
          "filters/applyNow",
        ),
      toggleCapability: (capability) =>
        set(
          (state) => ({
            capabilities: state.capabilities.includes(capability)
              ? state.capabilities.filter((c) => c !== capability)
              : [...state.capabilities, capability],
          }),
          false,
          "filters/toggleCapability",
        ),
      setMaxDistanceKm: (km) =>
        set({ maxDistanceKm: km }, false, "filters/setMaxDistanceKm"),
      setMinTrust: (n) => set({ minTrust: n }, false, "filters/setMinTrust"),
      setUserCoords: (lat, lon) =>
        set({ userLat: lat, userLon: lon }, false, "filters/setUserCoords"),
      hydrateFromScenario: (req) =>
        set(
          (state) => ({
            query: req.text ?? state.query,
            appliedQuery: req.text ?? state.appliedQuery,
            userLat: req.user_lat ?? state.userLat,
            userLon: req.user_lon ?? state.userLon,
            maxDistanceKm: req.max_distance_km ?? state.maxDistanceKm,
            minTrust: req.min_trust_score ?? state.minTrust,
            capabilities:
              (req.capabilities_filter as Capability[] | null | undefined) ??
              state.capabilities,
          }),
          false,
          "filters/hydrateFromScenario",
        ),
      reset: () => set({ ...FILTERS_INITIAL }, false, "filters/reset"),
    }),
    { name: "maarg/filters" },
  ),
);

/**
 * Stable selector returning exactly the four facets that drive the search
 * queryKey. user_lat/user_lon live on the same store but are intentionally
 * excluded so a viewport pan does not invalidate the cache.
 */
export type FilterPayload = {
  text: string;
  capabilities: Capability[];
  maxDistanceKm: number;
  minTrust: number;
};

export const selectFilterPayload = (s: FiltersState): FilterPayload => ({
  text: s.appliedQuery,
  capabilities: s.capabilities,
  maxDistanceKm: s.maxDistanceKm,
  minTrust: s.minTrust,
});
