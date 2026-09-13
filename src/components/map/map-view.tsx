"use client";

import dynamic from "next/dynamic";

import type { LeafletMapProps } from "@/components/map/leaflet-map";

/// Leaflet reaches for `window` as it renders, so the map is loaded client-side
/// only. `ssr: false` is not allowed in a Server Component, which is why this
/// thin client wrapper exists.
const LeafletMap = dynamic(() => import("@/components/map/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="media-placeholder h-full w-full animate-pulse"
      style={{ minHeight: "12rem" }}
    />
  ),
});

export function MapView(props: LeafletMapProps) {
  return <LeafletMap {...props} />;
}
