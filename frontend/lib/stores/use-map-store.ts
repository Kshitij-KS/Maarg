import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { Capability } from "@/lib/types";

export type MapViewport = {
  longitude: number;
  latitude: number;
  zoom: number;
};

export type MapState = {
  viewport: MapViewport;
  selectedPin: string | null;
  hoverPin: string | null;
  capabilityLayer: Capability;
  setViewport: (viewport: MapViewport) => void;
  setSelectedPin: (pin: string | null) => void;
  setHoverPin: (pin: string | null) => void;
  setCapabilityLayer: (capability: Capability) => void;
};

const INITIAL_VIEWPORT: MapViewport = { longitude: 80, latitude: 22, zoom: 4 };

export const useMapStore = create<MapState>()(
  devtools(
    (set) => ({
      viewport: INITIAL_VIEWPORT,
      selectedPin: null,
      hoverPin: null,
      capabilityLayer: "emergency_obstetric_care",
      setViewport: (viewport) => set({ viewport }, false, "map/setViewport"),
      setSelectedPin: (pin) =>
        set({ selectedPin: pin }, false, "map/setSelectedPin"),
      setHoverPin: (pin) => set({ hoverPin: pin }, false, "map/setHoverPin"),
      setCapabilityLayer: (capability) =>
        set({ capabilityLayer: capability }, false, "map/setCapabilityLayer"),
    }),
    { name: "maarg/map" },
  ),
);
