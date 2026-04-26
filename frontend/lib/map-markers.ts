import type { PinCodeDesert } from "@/lib/types";

export function desertMarkerKey(desert: PinCodeDesert, index: number): string {
  return [
    "desert",
    desert.pin_code,
    desert.capability,
    desert.lat,
    desert.lon,
    desert.nearest_verified_facility_id ?? "none",
    index,
  ].join("-");
}
