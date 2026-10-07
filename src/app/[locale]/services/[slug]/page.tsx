import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CoverImage } from "@/components/cover-image";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewList } from "@/components/reviews/review-list";
import { RatingSummary } from "@/components/reviews/stars";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { isPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { siteHiddenReason } from "@/lib/sites";
import { canReviewSite } from "@/server/reviews";
import { getCurrentUser, getMembership } from "@/server/session";

/// A service's own page. Deliberately not the site page: there are no events to
/// sell here and no guides to endorse, only what the place is, how to reach it,
/// and what people made of it.
export default async function ServicePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Services");
  const siteT = await getTranslations("Site");
  const kinds = await getTranslations("PlaceKinds");
  const reviewsT = await getTranslations("Reviews");
  const verificationT = await getTranslations("Verification");

  const service = await prisma.touristicSite.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!service) notFound();

  // A touristic site lives under /sites; it is not served here.
  if (service.kind === "SITE") notFound();

  const user = await getCurrentUser();
  const membership = user ? await getMembership(user.id, service.id) : null;

  // Until the platform has verified it, only its own team may see it.
  const hidden = siteHiddenReason(service);

  if (hidden && !membership) notFound();

  const [reviews, eligibility] = await Promise.all([
    prisma.review.findMany({
      where: {
        siteId: service.id,
        ...(user && isPlatformAdmin(user.platformRole)
          ? {}
          : { OR: [{ hiddenAt: null }, ...(user ? [{ userId: user.id }] : [])] }),
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
        user: { select: { name: true, email: true, image: true } },
      },
    }),
    canReviewSite(user?.id ?? null, service.id),
  ]);

  const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;
  const place = [service.address, service.city, service.country]
    .filter(Boolean)
    .join(", ");

  const contacts = [
    service.phone ? { label: t("phone"), value: service.phone, href: `tel:${service.phone}` } : null,
    service.whatsapp
      ? {
          label: t("whatsapp"),
          value: service.whatsapp,
          href: `https://wa.me/${service.whatsapp.replace(/[^0-9]/g, "")}`,
        }
      : null,
    service.website
      ? { label: t("website"), value: service.website, href: service.website }
      : null,
  ].filter((entry): entry is { label: string; value: string; href: string } => entry !== null);

  return (
    <div className="space-y-8">
      {hidden ? (
        <p className="alert alert-warning">
          {hidden === "unpublished"
            ? siteT("hiddenUnpublished")
            : siteT("hiddenAwaitingVerification")}
        </p>
      ) : null}

      <div className="card card-flush overflow-hidden">
        {service.coverImageUrl ? (
          <div className="relative">
            <CoverImage
              src={service.coverImageUrl}
              alt=""
              className="h-64 w-full object-cover sm:h-80"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-surface/90 backdrop-blur">
                  {kinds(service.kind)}
                </span>
                {service.verification === "VERIFIED" ? <VerifiedBadge /> : null}
                {hidden === "awaitingVerification" ? (
                  <span className="badge badge-warning">
                    {verificationT(service.verification)}
                  </span>
                ) : null}
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-[2.75rem] sm:leading-[1.1]">
                {service.name}
              </h1>

              {service.summary ? (
                <p className="max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
                  {service.summary}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-accent">{kinds(service.kind)}</span>
              {service.verification === "VERIFIED" ? <VerifiedBadge /> : null}
              {hidden === "awaitingVerification" ? (
                <span className="badge badge-warning">
                  {verificationT(service.verification)}
                </span>
              ) : null}
            </div>
            <h1 className="page-title sm:text-[2.125rem]">{service.name}</h1>
            {service.summary ? (
              <p className="max-w-2xl text-sm text-muted">{service.summary}</p>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          {service.description ? (
            <section className="card space-y-3">
              <h2 className="section-title text-base">{t("about")}</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {service.description}
              </p>
            </section>
          ) : null}

          {service.images.length > 0 ? (
            <section className="space-y-3">
              <h2 className="section-title text-base">{siteT("gallery")}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {service.images.map((image) => (
                  <CoverImage
                    key={image.id}
                    src={image.url}
                    alt=""
                    className="h-36 w-full rounded-xl border border-line"
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="section-title">{reviewsT("title")}</h2>
              <RatingSummary
                average={service.ratingAverage}
                count={service.ratingCount}
                label={reviewsT("count", { count: service.ratingCount })}
              />
            </div>

            {eligibility.allowed ? (
              <ReviewForm
                siteId={service.id}
                currentRating={myReview?.rating ?? null}
                currentBody={myReview?.body ?? null}
              />
            ) : eligibility.reason === "ownSite" ? null : (
              <p className="hint">
                {eligibility.reason === "signedOut"
                  ? reviewsT("signInToReview")
                  : reviewsT("notBeenYet")}
              </p>
            )}

            <ReviewList
              siteName={service.name}
              canModerate={Boolean(user && isPlatformAdmin(user.platformRole))}
              canReply={membership !== null}
              reviews={reviews.map((review) => ({
                id: review.id,
                rating: review.rating,
                body: review.body,
                createdAt: review.createdAt,
                editedAt: review.editedAt,
                authorName: review.user.name ?? review.user.email.split("@")[0],
                authorImage: review.user.image,
                isMine: review.userId === user?.id,
                hidden: review.hiddenAt !== null,
                reply: review.reply,
                repliedAt: review.repliedAt,
              }))}
            />
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <section className="card space-y-3">
            <h2 className="section-title text-base">{t("practical")}</h2>
            <dl className="space-y-2.5 text-sm">
              {place ? (
                <div>
                  <dt className="label">{t("address")}</dt>
                  <dd className="text-muted">{place}</dd>
                </div>
              ) : null}

              {service.openingHours ? (
                <div>
                  <dt className="label">{siteT("openingHours")}</dt>
                  <dd className="text-muted">{service.openingHours}</dd>
                </div>
              ) : null}

              {service.entryFeeCents > 0 ? (
                <div>
                  <dt className="label">{t("priceFrom")}</dt>
                  <dd className="text-muted">
                    {formatMoney(service.entryFeeCents, service.currency, locale)}
                  </dd>
                </div>
              ) : null}
            </dl>

            {service.latitude !== null && service.longitude !== null ? (
              <Link
                href={`/sites/${service.slug}/map`}
                className="btn-secondary btn-sm w-full"
              >
                {t("viewOnMap")}
              </Link>
            ) : null}
          </section>

          {/* There is no booking here, so the way to reach a service is the
              number on its page. */}
          {contacts.length > 0 ? (
            <section className="card space-y-3">
              <h2 className="section-title text-base">{t("contact")}</h2>
              <ul className="space-y-2 text-sm">
                {contacts.map((entry) => (
                  <li key={entry.label}>
                    <span className="label">{entry.label}</span>
                    <a
                      href={entry.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block break-words text-accent hover:underline"
                    >
                      {entry.value}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {membership ? (
            <Link
              href={`/manage/${service.slug}`}
              className="btn-secondary btn-sm w-full"
            >
              {t("manage")}
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
