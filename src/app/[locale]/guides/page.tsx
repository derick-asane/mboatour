import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RatingSummary } from "@/components/reviews/stars";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { GUIDE_LANGUAGES, isGuideLanguage } from "@/lib/guides";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/session";

/// The public directory. Only profiles the platform has checked appear here.
export default async function GuidesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; language?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { q, language } = await searchParams;
  const t = await getTranslations("Guides");
  const languages = await getTranslations("Languages");
  const common = await getTranslations("Common");
  const reviews = await getTranslations("Reviews");

  // Someone who already guides is not being invited to start; they want the
  // way back to their own profile.
  const viewer = await getCurrentUser();
  const myProfile = viewer
    ? await prisma.guideProfile.findUnique({
        where: { userId: viewer.id },
        select: { id: true },
      })
    : null;

  const query = q?.trim();
  const filter = language && isGuideLanguage(language) ? language : null;

  const guides = await prisma.guideProfile.findMany({
    where: {
      status: "VERIFIED",
      ...(filter ? { languages: { has: filter } } : {}),
      ...(query
        ? {
            OR: [
              { headline: { contains: query, mode: "insensitive" as const } },
              { city: { contains: query, mode: "insensitive" as const } },
              { country: { contains: query, mode: "insensitive" as const } },
              { user: { name: { contains: query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: { verifiedAt: "desc" },
    select: {
      id: true,
      slug: true,
      headline: true,
      city: true,
      country: true,
      languages: true,
      photoUrl: true,
      dailyRateCents: true,
      hourlyRateCents: true,
      currency: true,
      ratingAverage: true,
      ratingCount: true,
      user: { select: { name: true } },
      // Only the ones a site actually granted: a request still waiting, or one
      // that was turned down, is not an endorsement and must not be counted as
      // one on a public card.
      _count: { select: { endorsements: { where: { status: "APPROVED" } } } },
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("directoryTitle")}
        description={t("directorySubtitle")}
        actions={
          <Link href="/guide" className="btn-secondary">
            {myProfile ? t("yourProfile") : t("becomeAGuide")}
          </Link>
        }
      />

      <form className="flex flex-wrap gap-2 rounded-xl border border-line surface-muted p-2">
        <input
          className="input min-w-56 flex-1"
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t("searchPlaceholder")}
        />

        <select className="input w-auto" name="language" defaultValue={filter ?? ""}>
          <option value="">{t("anyLanguage")}</option>
          {GUIDE_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {languages(code)}
            </option>
          ))}
        </select>

        <button type="submit" className="btn-primary">
          {common("search")}
        </button>
      </form>

      {guides.length === 0 ? (
        <EmptyState title={t("noGuides")} description={t("noGuidesHint")} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => {
            const rate =
              guide.dailyRateCents ?? guide.hourlyRateCents ?? null;

            return (
              <Link
                key={guide.id}
                href={`/guides/${guide.slug}`}
                className="card card-interactive flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  {guide.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={guide.photoUrl}
                      alt=""
                      className="media-placeholder h-14 w-14 shrink-0 rounded-full border border-line object-cover"
                    />
                  ) : (
                    <span className="avatar h-14 w-14 text-base">
                      {(guide.user.name ?? "?").trim().charAt(0)}
                    </span>
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-semibold tracking-tight">
                      {guide.user.name ?? t("guide")}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {[guide.city, guide.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>

                <p className="line-clamp-2 text-sm text-muted">{guide.headline}</p>

                <div className="flex flex-wrap gap-1.5">
                  {guide.languages.slice(0, 4).map((code) => (
                    <span key={code} className="badge">
                      {isGuideLanguage(code) ? languages(code) : code}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                  {rate === null ? (
                    <span className="text-xs text-faint">{t("rateOnRequest")}</span>
                  ) : (
                    <span className="text-xs font-medium text-accent">
                      {formatMoney(rate, guide.currency, locale)}
                      {guide.dailyRateCents ? ` ${t("perDay")}` : ` ${t("perHour")}`}
                    </span>
                  )}

                  {guide._count.endorsements > 0 ? (
                    <span className="badge badge-accent">
                      {t("endorsedBy", { count: guide._count.endorsements })}
                    </span>
                  ) : null}

                  <RatingSummary
                    average={guide.ratingAverage}
                    count={guide.ratingCount}
                    label={reviews("count", { count: guide.ratingCount })}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
