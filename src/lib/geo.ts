/// Great-circle distance, computed in the browser. Straight-line, not a driving
/// route: turn-by-turn is handed off to a maps app instead.

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const LATITUDE_RANGE = { min: -90, max: 90 };
export const LONGITUDE_RANGE = { min: -180, max: 180 };

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= LATITUDE_RANGE.min &&
    latitude <= LATITUDE_RANGE.max &&
    longitude >= LONGITUDE_RANGE.min &&
    longitude <= LONGITUDE_RANGE.max
  );
}

/// Opens the destination in whatever maps app the visitor has, which does the
/// routing far better than we could, and costs nothing.
export function directionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

export function osmUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;
}

export type Route = {
  /// Leaflet order: [latitude, longitude].
  points: [number, number][];
  distanceKm: number;
  durationMinutes: number;
};

type OsrmResponse = {
  code?: string;
  routes?: {
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }[];
};

/// OSRM's public demo server: no key, fair-use only. A production deployment
/// should point this at a self-hosted OSRM or a keyed routing provider.
const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";

/// Road route between two points, drawn on our own map rather than handed to an
/// external maps site. Returns null when no route could be built.
export async function fetchDrivingRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<Route | null> {
  const path = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const response = await fetch(
    `${OSRM_ROUTE_URL}/${path}?overview=full&geometries=geojson`,
    { signal },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as OsrmResponse;
  const route = data.routes?.[0];

  if (data.code !== "Ok" || !route?.geometry?.coordinates?.length) return null;

  return {
    // OSRM answers in [longitude, latitude]; Leaflet wants the other order.
    points: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: (route.distance ?? 0) / 1000,
    durationMinutes: (route.duration ?? 0) / 60,
  };
}
