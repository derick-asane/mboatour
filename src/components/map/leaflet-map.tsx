"use client";

import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  ZoomControl,
} from "react-leaflet";
import { useEffect } from "react";

import "leaflet/dist/leaflet.css";

/// Leaflet's default marker points at image files that bundlers rewrite, which
/// leaves a broken icon. Drawing the pin inline avoids the asset entirely.
const PIN = L.divIcon({
  className: "",
  html: `
    <span style="
      display:block; width:28px; height:28px; transform:translate(-50%,-100%);
      color:#0d6b58; filter:drop-shadow(0 2px 3px rgb(0 0 0 / 0.35));
    ">
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M12 22s7.5-6.6 7.5-12a7.5 7.5 0 1 0-15 0c0 5.4 7.5 12 7.5 12Z"/>
        <circle cx="12" cy="10" r="3.1" fill="white"/>
      </svg>
    </span>`,
  iconSize: [28, 28],
  iconAnchor: [0, 0],
});

/// Where the visitor is standing, when they have asked for a route.
const HERE = L.divIcon({
  className: "",
  html: `
    <span style="
      display:block; width:16px; height:16px; border-radius:999px;
      background:#1d6fe0; border:3px solid white;
      box-shadow:0 0 0 2px rgb(29 111 224 / 0.35); transform:translate(-50%,-50%);
    "></span>`,
  iconSize: [16, 16],
  iconAnchor: [0, 0],
});

/// Map tiles are light in both themes, so the route keeps one fixed colour.
const ROUTE_STYLE = { color: "#0d6b58", weight: 5, opacity: 0.85 };

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom(), { animate: false });
  }, [map, latitude, longitude]);

  return null;
}

/// Pulls the whole route into view once it arrives.
function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;

    map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
  }, [map, points]);

  return null;
}

export type LeafletMapProps = {
  latitude: number;
  longitude: number;
  zoom?: number;
  className?: string;
  /// A preview inside a form should not steal scroll or wander off the pin.
  interactive?: boolean;
  /// A road route to draw, in Leaflet's [latitude, longitude] order.
  route?: [number, number][];
  origin?: { latitude: number; longitude: number };
  /// A full-screen map should zoom on scroll; one embedded in a page must not
  /// steal the scroll from the page around it.
  scrollWheelZoom?: boolean;
  zoomPosition?: "topleft" | "topright" | "bottomleft" | "bottomright";
};

export default function LeafletMap({
  latitude,
  longitude,
  zoom = 13,
  className = "h-64 w-full",
  interactive = true,
  route,
  origin,
  scrollWheelZoom = false,
  zoomPosition = "topleft",
}: LeafletMapProps) {
  const hasRoute = Boolean(route && route.length > 1);

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={zoom}
      scrollWheelZoom={scrollWheelZoom}
      dragging={interactive}
      doubleClickZoom={interactive}
      zoomControl={false}
      attributionControl
      className={className}
    >
      <TileLayer
        // OpenStreetMap's public tiles: no key, fair-use policy. Swap this URL
        // for a keyed provider (MapTiler, Mapbox) when traffic justifies it.
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      {interactive ? <ZoomControl position={zoomPosition} /> : null}

      {hasRoute ? <Polyline positions={route!} pathOptions={ROUTE_STYLE} /> : null}

      {origin ? (
        <Marker position={[origin.latitude, origin.longitude]} icon={HERE} />
      ) : null}

      <Marker position={[latitude, longitude]} icon={PIN} />

      {hasRoute ? (
        <FitRoute points={route!} />
      ) : (
        <Recenter latitude={latitude} longitude={longitude} />
      )}
    </MapContainer>
  );
}
