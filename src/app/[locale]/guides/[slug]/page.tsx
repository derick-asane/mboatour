import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { GuideReviewControls } from "@/components/guides/guide-review-controls";
import { GuideReviewForm } from "@/components/guides/guide-review-form";
import { RequestGuideDialog } from "@/components/guides/request-guide-dialog";
import { PageHeader } from "@/components/page-header";
import { RatingSummary, Stars } from "@/components/reviews/stars";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { isGuideLanguage } from "@/lib/guides";
import { isPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { canReviewGuide } from "@/server/guide-reviews";
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

  const reviewsT = await getTranslations("Reviews");
  const format = await getFormatter();

  const [reviews, eligibility] = await Promise.all([
    prisma.guideReview.findMany({
      where: {
        guideId: guide.id,
        // A hidden review stays visible to its author and to the platform, so
        // nobody wonders where their words went.
        ...(viewer && isPlatformAdmin(viewer.platformRole)
          ? {}
          : {
              OR: [
                { hiddenAt: null },
                ...(viewer ? [{ userId: viewer.id }] : []),
              ],
            }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        body: true,
        createdAt: true,
        editedAt: true,
        hiddenAt: true,
        reply: true,
        repliedAt: true,
        userId: true,
        user: { select: { name: true, email: true } },
      },
    }),
    canReviewGuide(viewer?.id ?? null, { id: guide.id, userId: guide.userId }),
  ]);

  const myReview = viewer
    ? reviews.find((review) => review.userId === viewer.id)
    : undefined;

  const isGuideOwner = viewer?.id === guide.userId;

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

          <div className="mt-2">
            <RatingSummary
              average={guide.ratingAverage}
              count={guide.ratingCount}
              label={reviewsT("count", { count: guide.ratingCount })}
            />
          </div>
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

      <section className="space-y-4">
        <h2 className="section-title">{reviewsT("title")}</h2>

        {eligibility.allowed ? (
          <GuideReviewForm
            guideId={guide.id}
            currentRating={myReview?.rating ?? null}
            currentBody={myReview?.body ?? null}
          />
        ) : eligibility.reason === "ownProfile" ? null : (
          <p className="hint">
            {eligibility.reason === "signedOut"
              ? reviewsT("signInToReview")
              : t("guideNotBeenYetHint")}
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="empty-state">{reviewsT("none")}</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => {
              const author =
                review.user.name ?? review.user.email.split("@")[0];
              const mine = review.userId === viewer?.id;

              return (
                <li
                  key={review.id}
                  className={`card space-y-3 ${review.hiddenAt ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="avatar shrink-0">
                      {author.trim().charAt(0) || "?"}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {mine ? reviewsT("you") : author}
                        <Stars rating={review.rating} className="h-3.5 w-3.5" />
                        {review.hiddenAt ? (
                          <span className="badge badge-danger">
                            {reviewsT("hidden")}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-faint">
                        {format.dateTime(review.createdAt, { dateStyle: "medium" })}
                        {review.editedAt ? ` · ${reviewsT("editedMark")}` : ""}
                      </p>
                    </div>
                  </div>

                  {review.body ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                      {review.body}
                    </p>
                  ) : null}

                  {review.reply ? (
                    <div className="rounded-xl border border-line surface-muted p-3">
                      <p className="text-xs font-medium">
                        {t("replyFromGuide")}
                        {review.repliedAt
                          ? ` · ${format.dateTime(review.repliedAt, { dateStyle: "medium" })}`
                          : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-muted">
                        {review.reply}
                      </p>
                    </div>
                  ) : null}

                  <GuideReviewControls
                    reviewId={review.id}
                    isMine={mine}
                    isGuide={isGuideOwner}
                    hidden={review.hiddenAt !== null}
                    canModerate={Boolean(
                      viewer && isPlatformAdmin(viewer.platformRole),
                    )}
                    currentReply={review.reply}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
