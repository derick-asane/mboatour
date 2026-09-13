/// Categories are stored as these stable keys and shown through the
/// `Categories` message namespace, so the label follows the reader's language.

export const SITE_CATEGORIES = [
  "MUSEUM",
  "MONUMENT",
  "HISTORIC_SITE",
  "RELIGIOUS_SITE",
  "GALLERY",
  "NATIONAL_PARK",
  "NATURE_RESERVE",
  "BEACH",
  "WATERFALL",
  "MOUNTAIN",
  "LAKE",
  "ZOO_AQUARIUM",
  "THEME_PARK",
  "CULTURAL_VILLAGE",
  "OTHER",
] as const;

export type SiteCategory = (typeof SITE_CATEGORIES)[number];

export function isSiteCategory(value: string): value is SiteCategory {
  return (SITE_CATEGORIES as readonly string[]).includes(value);
}
