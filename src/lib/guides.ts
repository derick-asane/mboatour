/// Client-safe vocabulary for guide profiles.

/// Languages a guide might work in, weighted towards Cameroon. Stored as these
/// keys and shown through the `Languages` namespace, so the label follows the
/// reader rather than the guide.
export const GUIDE_LANGUAGES = [
  "EN",
  "FR",
  "PIDGIN",
  "DUALA",
  "EWONDO",
  "FULFULDE",
  "BAMILEKE",
  "DE",
  "ES",
  "IT",
  "ZH",
  "AR",
] as const;

export type GuideLanguage = (typeof GUIDE_LANGUAGES)[number];

export function isGuideLanguage(value: string): value is GuideLanguage {
  return (GUIDE_LANGUAGES as readonly string[]).includes(value);
}

export const MAX_GUIDE_BIO = 3000;
export const MAX_GUIDE_HEADLINE = 120;

/// A profile is only listed publicly once the platform has checked it.
export function isGuidePublic(status: string): boolean {
  return status === "VERIFIED";
}
