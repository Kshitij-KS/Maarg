import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type UserLocation = {
  lat: number;
  lon: number;
  city?: string;
};

export type UIState = {
  activeFacilityId: string | null;
  sheetOpen: boolean;
  traceOpen: boolean;
  userLocation: UserLocation | null;
  ambulanceModalOpen: boolean;
  setActiveFacilityId: (id: string | null) => void;
  setSheetOpen: (open: boolean) => void;
  setTraceOpen: (open: boolean) => void;
  setUserLocation: (loc: UserLocation | null) => void;
  setAmbulanceModalOpen: (open: boolean) => void;
  openFacility: (id: string) => void;
};

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      activeFacilityId: null,
      sheetOpen: false,
      traceOpen: false,
      userLocation: null,
      ambulanceModalOpen: false,
      setActiveFacilityId: (id) =>
        set({ activeFacilityId: id }, false, "ui/setActiveFacilityId"),
      setSheetOpen: (open) => set({ sheetOpen: open }, false, "ui/setSheetOpen"),
      setTraceOpen: (open) => set({ traceOpen: open }, false, "ui/setTraceOpen"),
      setUserLocation: (loc) =>
        set({ userLocation: loc }, false, "ui/setUserLocation"),
      setAmbulanceModalOpen: (open) =>
        set({ ambulanceModalOpen: open }, false, "ui/setAmbulanceModalOpen"),
      openFacility: (id) =>
        set({ activeFacilityId: id, sheetOpen: true }, false, "ui/openFacility"),
    }),
    { name: "maarg/ui" },
  ),
);
