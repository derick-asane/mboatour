/// What a listing is. A touristic site is a place people come to see; the rest
/// are services somebody runs for them — somewhere to sleep, somewhere to eat,
/// a way to get around. They are one record type because they want the same
/// things: a team, photos, a position, opening hours, reviews, and a badge the
/// platform grants only after looking.
///
/// Plain values, kept apart from anything that touches Prisma so the browser
/// bundle can import them.

export const PLACE_KINDS = [
  "SITE",
  "HOTEL",
  "RESTAURANT",
  "TRANSPORT",
  "TOUR_OPERATOR",
  "SHOP",
  "OTHER",
] as const;

export type PlaceKind = (typeof PLACE_KINDS)[number];

/// Everything that is not a site is a service, and lives under its own tab.
export const SERVICE_KINDS = PLACE_KINDS.filter(
  (kind) => kind !== "SITE",
) as readonly Exclude<PlaceKind, "SITE">[];

export type ServiceKind = (typeof SERVICE_KINDS)[number];

export function isPlaceKind(value: unknown): value is PlaceKind {
  return typeof value === "string" && (PLACE_KINDS as readonly string[]).includes(value);
}

export function isServiceKind(value: unknown): value is ServiceKind {
  return (
    typeof value === "string" && (SERVICE_KINDS as readonly string[]).includes(value)
  );
}

/// Where a listing lives, which depends on what it is.
export function placeHref(kind: string, slug: string): string {
  return kind === "SITE" ? `/sites/${slug}` : `/services/${slug}`;
}
