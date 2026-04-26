import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { queryFacilities } from "@/lib/api";
import { useFiltersStore } from "@/lib/stores/use-filters-store";
import type { QueryRequest } from "@/lib/types";

export function useSearchResults() {
  const text = useFiltersStore((s) => s.appliedQuery);
  const capabilities = useFiltersStore((s) => s.capabilities);
  const maxDistanceKm = useFiltersStore((s) => s.maxDistanceKm);
  const minTrust = useFiltersStore((s) => s.minTrust);
  const userLat = useFiltersStore((s) => s.userLat);
  const userLon = useFiltersStore((s) => s.userLon);
  const filterPayload = useMemo(
    () => ({
      text,
      capabilities,
      maxDistanceKm,
      minTrust,
    }),
    [text, capabilities, maxDistanceKm, minTrust],
  );

  return useQuery({
    queryKey: ["search", filterPayload, userLat, userLon] as const,
    queryFn: () => {
      const request: QueryRequest = {
        text: filterPayload.text,
        user_lat: userLat,
        user_lon: userLon,
        max_distance_km: filterPayload.maxDistanceKm,
        min_trust_score: filterPayload.minTrust,
        capabilities_filter: filterPayload.capabilities.length
          ? [...filterPayload.capabilities]
          : null,
        top_k: 10,
      };
      return queryFacilities(request);
    },
    enabled: filterPayload.text.length > 0,
    staleTime: 60_000,
  });
}
