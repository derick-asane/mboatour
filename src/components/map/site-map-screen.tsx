"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { MapView } from "@/components/map/map-view";
import { Link } from "@/i18n/navigation";
import {
  directionsUrl,
  distanceKm,
  fetchDrivingRoute,
  type Route,
} from "@/lib/geo";

type Origin = { latitude: number; longitude: number };

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 300_000,
};

type State =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "routing"; origin: Origin }
  | { status: "routed"; origin: Origin; route: Route }
  /// Routing can fail while the position is perfectly good; the straight-line
  /// distance is still worth showing rather than nothing at all.
  | { status: "straightLine"; origin: Origin; km: number }
  | { status: "error"; reason: "denied" | "unavailable" };

export function SiteMapScreen({
  slug,
  name,
  address,
  latitude,
  longitude,
  autoRoute,
}: {
  slug: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  /// Set when the visitor arrived by pressing "Get directions", so the route
  /// starts building straight away instead of asking twice.
  autoRoute: boolean;
}) {
  const t = useTranslations("Map");
  const format = useFormatter();
  // Arriving from "Get directions" starts in the locating state, so the effect
  // below only has to call the browser API rather than also set state.
  const [state, setState] = useState<State>(
    autoRoute ? { status: "locating" } : { status: "idle" },
  );

  const onPosition = useCallback<PositionCallback>(
    async (position) => {
      const destination = { latitude, longitude };
      const origin = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setState({ status: "routing", origin });

      try {
        const found = await fetchDrivingRoute(origin, destination);

        setState(
          found
            ? { status: "routed", origin, route: found }
            : {
                status: "straightLine",
                origin,
                km: distanceKm(origin, destination),
              },
        );
      } catch {
        setState({
          status: "straightLine",
          origin,
          km: distanceKm(origin, destination),
        });
      }
    },
    [latitude, longitude],
  );

  const onPositionError = useCallback<PositionErrorCallback>((error) => {
    setState({
      status: "error",
      reason: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
    });
  }, []);

  useEffect(() => {
    if (!autoRoute) return;

    if (!("geolocation" in navigator)) {
      // Deferred so the effect itself stays free of synchronous state writes.
      queueMicrotask(() =>
        setState({ status: "error", reason: "unavailable" }),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      onPosition,
      onPositionError,
      GEOLOCATION_OPTIONS,
    );
  }, [autoRoute, onPosition, onPositionError]);

  /// The button path may write state straight away: it runs from a click.
  function start() {
    if (!("geolocation" in navigator)) {
      setState({ status: "error", reason: "unavailable" });
      return;
    }

    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      onPosition,
      onPositionError,
      GEOLOCATION_OPTIONS,
    );
  }

  const working = state.status === "locating" || state.status === "routing";
  const origin =
    state.status === "routing" ||
    state.status === "routed" ||
    state.status === "straightLine"
      ? state.origin
      : undefined;

  function readableDuration(minutes: number): string {
    const rounded = Math.round(minutes);

    if (rounded < 60) return t("durationMinutes", { minutes: rounded });

    return t("durationHours", {
      hours: Math.floor(rounded / 60),
      minutes: rounded % 60,
    });
  }

  return (
    // Covers the page it opened from, header included: a map reads better with
    // the whole screen than squeezed into a column.
    <div className="fixed inset-0 z-50 bg-background">
      <MapView
        latitude={latitude}
        longitude={longitude}
        className="h-full w-full"
        route={state.status === "routed" ? state.route.points : undefined}
        origin={origin}
        scrollWheelZoom
        zoomPosition="bottomright"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-line bg-surface/95 p-2 shadow-md backdrop-blur">
          <Link
            href={`/sites/${slug}`}
            className="btn-ghost btn-sm shrink-0"
            aria-label={t("back")}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M19 12H6M12 5l-7 7 7 7" />
            </svg>
            {t("back")}
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">{name}</p>
            {address ? (
              <p className="truncate text-xs text-muted">{address}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto max-w-3xl space-y-3 rounded-xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur">
          {state.status === "routed" ? (
            <p className="alert alert-success">
              {t("routeSummary", {
                km: format.number(state.route.distanceKm, {
                  maximumFractionDigits: state.route.distanceKm < 10 ? 1 : 0,
                }),
                duration: readableDuration(state.route.durationMinutes),
              })}
            </p>
          ) : null}

          {state.status === "straightLine" ? (
            <p className="alert">
              {t("routeUnavailable", {
                km: format.number(state.km, {
                  maximumFractionDigits: state.km < 10 ? 1 : 0,
                }),
              })}
            </p>
          ) : null}

          {state.status === "error" ? (
            <p className="alert alert-error">
              {state.reason === "denied" ? t("denied") : t("unavailable")}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={start}
              disabled={working}
              className="btn-primary btn-sm"
            >
              {working ? <span aria-hidden className="spinner" /> : null}
              {state.status === "routing"
                ? t("routing")
                : state.status === "locating"
                  ? t("locating")
                  : state.status === "routed" || state.status === "straightLine"
                    ? t("directionsAgain")
                    : t("directions")}
            </button>

            {state.status === "routed" || state.status === "straightLine" ? (
              <button
                type="button"
                onClick={() => setState({ status: "idle" })}
                className="btn-ghost btn-sm"
              >
                {t("clearRoute")}
              </button>
            ) : null}

            <a
              href={directionsUrl(latitude, longitude)}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-ghost btn-sm ml-auto"
            >
              {t("openExternally")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
