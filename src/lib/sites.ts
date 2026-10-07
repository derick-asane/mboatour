/// What makes a site public, in one place. Two different people have to agree
/// before a stranger can see it: the team publishes it, and the platform
/// verifies it. Publishing alone is the team's own word for it, which is not
/// enough to put a place in front of travellers who will turn up there.
///
/// Everything that lists or opens a site for the public goes through here, so
/// the rule cannot drift apart between the explore page, the home page and the
/// actions that accept a site id from a browser.

export type SiteVisibility = {
  published: boolean;
  verification: string;
};

/// A `where` fragment for any query that serves the public. It says nothing
/// about what kind of listing it is, so callers that serve one tab add that
/// themselves.
export function publicSiteWhere() {
  return { published: true, verification: "VERIFIED" as const };
}

/// Public touristic sites only — the explore tab, and anything a guide can be
/// asked to cover.
export function publicTouristicSiteWhere() {
  return { ...publicSiteWhere(), kind: "SITE" as const };
}

/// Public services only: everything that is not a touristic site.
export function publicServiceWhere() {
  return { ...publicSiteWhere(), kind: { not: "SITE" as const } };
}

/// The same rule for a site already in hand.
export function isSitePublic(site: SiteVisibility): boolean {
  return site.published && site.verification === "VERIFIED";
}

/// Why a site the team can see is not yet public, for the notice they are
/// shown. Null once it is public.
export function siteHiddenReason(
  site: SiteVisibility,
): "unpublished" | "awaitingVerification" | null {
  if (!site.published) return "unpublished";
  if (site.verification !== "VERIFIED") return "awaitingVerification";

  return null;
}
