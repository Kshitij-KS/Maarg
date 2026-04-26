export function formatTrustScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function formatDistanceKm(distanceKm: number | null | undefined): string {
  if (distanceKm == null) {
    return "Distance unavailable";
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function formatConfidenceInterval(low: number, high: number): string {
  return `${formatTrustScore(low)} to ${formatTrustScore(high)}`;
}
