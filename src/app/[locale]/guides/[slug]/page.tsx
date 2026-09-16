import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { RequestGuideDialog } from "@/components/guides/request-guide-dialog";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { isGuideLanguage } from "@/lib/guides";
import { isPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/session";

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Guides");
  const languages = await getTranslations("Languages");

  const guide = await prisma.guideProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, name: true } },
      endorsements: {
        where: { status: "APPROVED" },
        include: { site: { select: { name: true, slug: true } } },
      },
    },
  });

  if (!guide) notFound();

  const viewer = await getCurrentUser();

  // Somewhere to take them: only published sites can be named in a request.
  const sites = await prisma.touristicSite.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 50,
  });

  // An unchecked profile is visible to its owner and to the platform, so a
  // guide can see their own page while it waits.
  const visible =
    guide.status === "VERIFIED" ||
    viewer?.id === guide.userId ||
    (viewer !== null && isPlatformAdmin(viewer.platformRole));

  if (!visible) notFound();

  const rates = [
    guide.hourlyRateCents !== null
      ? {
          label: t("perHour"),
          value: formatMoney(guide.hourlyRateCents, guide.currency, locale),
        }
      : null,
    guide.dailyRateCents !== null
      ? {
          label: t("perDay"),
          value: formatMoney(guide.dailyRateCents, guide.currency, locale),
        }
      : null,
  ].filter((row) => row !== null);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {guide.status !== "VERIFIED" ? (
        <p className="alert alert-warning">{t("notPublicYet")}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        {guide.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={guide.photoUrl}
            alt=""
            className="media-placeholder h-24 w-24 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <span className="avatar h-24 w-24 text-2xl">
            {(guide.user.name ?? "?").trim().charAt(0)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <PageHeader
            eyebrow={t("eyebrow")}
            title={guide.user.name ?? t("guide")}
            description={guide.headline}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {guide.languages.map((code) => (
          <span key={code} className="badge">
            {isGuideLanguage(code) ? languages(code) : code}
          </span>
        ))}
        {guide.yearsExperience !== null ? (
          <span className="badge">
            {t("yearsOfExperience", { count: guide.yearsExperience })}
          </span>
        ) : null}
        {[guide.city, guide.country].filter(Boolean).length > 0 ? (
          <span className="badge">
            {[guide.city, guide.country].filter(Boolean).join(", ")}
          </span>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="section-title">{t("about")}</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
          {guide.bio}
        </p>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="section-title text-base">{t("rates")}</h2>
          {rates.length === 0 ? (
            <p className="text-sm text-muted">{t("rateOnRequest")}</p>
          ) : (
            <dl className="space-y-2 text-sm">
              {rates.map((rate) => (
                <div key={rate.label} className="flex justify-between gap-4">
                  <dt className="text-muted">{rate.label}</dt>
                  <dd className="font-medium">{rate.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {guide.status === "VERIFIED" && viewer?.id !== guide.userId ? (
            <RequestGuideDialog
              guideId={guide.id}
              guideName={guide.user.name ?? t("guide")}
              currency={guide.currency}
              suggestedAmountCents={guide.dailyRateCents ?? guide.hourlyRateCents}
              sites={sites}
            />
          ) : null}

          <p className="hint">{t("paidDirectNotice")}</p>
        </section>

        <section className="card space-y-3">
          <h2 className="section-title text-base">{t("endorsementsTitle")}</h2>
          {guide.endorsements.length === 0 ? (
            <p className="text-sm text-muted">{t("noEndorsementsPublic")}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {guide.endorsements.map((endorsement) => (
                <li key={endorsement.id}>
                  <Link
                    href={`/sites/${endorsement.site.slug}`}
                    className="badge badge-accent"
                  >
                    {endorsement.site.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="hint">{t("endorsementsExplain")}</p>
        </section>
      </div>
    </div>
  );
}
