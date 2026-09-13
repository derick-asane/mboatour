"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Field } from "@/components/form";
import { MapView } from "@/components/map/map-view";
import { isValidCoordinate } from "@/lib/geo";

/// Coordinates are typed in. The map below is a read-only preview: it confirms
/// the numbers landed where the team expected, and catches a swapped pair or a
/// missing minus sign before the site goes live.
export function CoordinateFields({
  latitude,
  longitude,
  invalidClass,
}: {
  latitude: number | null;
  longitude: number | null;
  invalidClass: (field: string) => string;
}) {
  const t = useTranslations("Map");
  const [lat, setLat] = useState(latitude === null ? "" : String(latitude));
  const [lon, setLon] = useState(longitude === null ? "" : String(longitude));
  const [locating, setLocating] = useState(false);

  const parsedLat = Number.parseFloat(lat);
  const parsedLon = Number.parseFloat(lon);
  const bothEntered = lat.trim() !== "" && lon.trim() !== "";
  const valid = bothEntered && isValidCoordinate(parsedLat, parsedLon);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLon(position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("latitude")} hint={t("latitudeHint")}>
          <input
            className={invalidClass("latitude")}
            name="latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            inputMode="decimal"
            placeholder="4.155"
            value={lat}
            onChange={(event) => setLat(event.target.value)}
          />
        </Field>

        <Field label={t("longitude")} hint={t("longitudeHint")}>
          <input
            className={invalidClass("longitude")}
            name="longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            inputMode="decimal"
            placeholder="9.231"
            value={lon}
            onChange={(event) => setLon(event.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={useMyLocation}
          disabled={locating}
        >
          {locating ? <span aria-hidden className="spinner" /> : null}
          {t("useMyLocation")}
        </button>

        {bothEntered ? (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setLat("");
              setLon("");
            }}
          >
            {t("clearCoordinates")}
          </button>
        ) : null}
      </div>

      {valid ? (
        <div className="overflow-hidden rounded-xl border border-line">
          <MapView
            latitude={parsedLat}
            longitude={parsedLon}
            className="h-56 w-full"
            interactive={false}
          />
          <p className="hint px-3 py-2">{t("previewNote")}</p>
        </div>
      ) : bothEntered ? (
        <p className="alert alert-error">{t("invalidCoordinates")}</p>
      ) : (
        <p className="hint">{t("coordinatesHelp")}</p>
      )}
    </div>
  );
}
