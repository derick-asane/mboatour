import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { BookEventForm } from "@/app/[locale]/sites/[slug]/book-event-form";
import { VisitRequestForm } from "@/app/[locale]/sites/[slug]/visit-request-form";
import { CoverImage } from "@/components/cover-image";
import { EmptyState } from "@/components/empty-state";
import { SiteLocationCard } from "@/components/map/site-location-card";
import { StatusBadge } from "@/components/status-badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/server/session";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Site");
  const eventsT = await getTranslations("Events");
  const common = await getTranslations("Common");
  const chatT = await getTranslations("Chat");
  const categories = await getTranslations("Categories");
  const format = await getFormatter();

  const site = await prisma.touristicSite.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!site) notFound();

  const user = await getCurrentUser();
  const membership = user ? await getMembership(user.id, site.id) : null;

  // Drafts stay visible to the site team only.
  if (!site.published && !membership) notFound();

  const events = await prisma.event.findMany({
    where: {
      siteId: site.id,
      status: "PUBLISHED",
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    include: {
      bookings: {
        where: { status: { not: "CANCELLED" } },
        select: { seats: true, userId: true },
      },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  const pendingVisit = user
    ? await prisma.visitRequest.findFirst({
        where: { siteId: site.id, userId: user.id, status: "PENDING" },
        select: { id: true },
      })
    : null;

  const place = [site.address, site.city, site.country].filter(Boolean).join(", ");

  const practical = [
    site.openingHours
      ? { term: t("openingHours"), value: site.openingHours }
      : null,
    {
      term: t("entryFee"),
      value:
        site.entryFeeCents === 0
          ? common("free")
          : formatMoney(site.entryFeeCents, site.currency, locale),
    },
    place ? { term: t("location"), value: place } : null,
  ].filter((row) => row !== null);

  return (
    <div className="space-y-10">
      {/* A cover photo carries the place better than any heading, so it runs
          full width with the name laid over it. Without one, the same block
          falls back to plain type on the surface. */}
      <section className="panel overflow-hidden">
        {site.coverImageUrl ? (
          <div className="relative">
            <CoverImage
              src={site.coverImageUrl}
              alt=""
              className="h-72 w-full sm:h-96 lg:h-[28rem]"
            />

            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
            />

            <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {site.category ? (
                  <span className="badge bg-surface/90 backdrop-blur">
                    {categories.has(site.category)
                      ? categories(site.category)
                      : site.category}
                  </span>
                ) : null}
                {site.verification === "VERIFIED" ? <VerifiedBadge /> : null}
                {!site.published ? <StatusBadge status="DRAFT" /> : null}
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-[2.75rem] sm:leading-[1.1]">
                {site.name}
              </h1>

              {site.summary ? (
                <p className="max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
                  {site.summary}
                </p>
              ) : null}

              {place ? (
                <p className="flex items-center gap-1.5 text-sm text-white/80">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0"
                  >
                    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  {place}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {site.category ? (
                <span className="badge badge-accent">
                  {categories.has(site.category)
                    ? categories(site.category)
                    : site.category}
                </span>
              ) : null}
              {site.verification === "VERIFIED" ? <VerifiedBadge /> : null}
              {!site.published ? <StatusBadge status="DRAFT" /> : null}
            </div>

            <h1 className="page-title sm:text-[2.125rem]">{site.name}</h1>

            {site.summary ? (
              <p className="lede max-w-2xl">{site.summary}</p>
            ) : null}

            {place ? (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 shrink-0"
                >
                  <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                {place}
              </p>
            ) : null}
          </div>
        )}

        {membership ? (
          <div className="flex justify-end border-t border-line p-4">
            <Link href={`/manage/${site.slug}`} className="btn-secondary btn-sm">
              {t("manageCta")}
            </Link>
          </div>
        ) : null}
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          {site.description ? (
            <section className="space-y-3">
              <h2 className="section-title">{t("about")}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                {site.description}
              </p>
            </section>
          ) : null}

          {site.images.length > 0 ? (
            <section className="space-y-3">
              <h2 className="section-title">{t("gallery")}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {site.images.map((image) => (
                  <li key={image.id}>
                    <CoverImage
                      src={image.url}
                      alt=""
                      className="h-32 w-full rounded-xl border border-line sm:h-36"
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-4">
            <h2 className="section-title">{t("events")}</h2>

            {events.length === 0 ? (
              <EmptyState title={t("noEvents")} />
            ) : (
              <ul className="space-y-4">
                {events.map((event) => {
                  const takenSeats = event.bookings.reduce(
                    (total, booking) => total + booking.seats,
                    0,
                  );
                  const seatsLeft =
                    event.capacity === null
                      ? null
                      : Math.max(event.capacity - takenSeats, 0);
                  const alreadyBooked = user
                    ? event.bookings.some((booking) => booking.userId === user.id)
                    : false;

                  return (
                    <li key={event.id} className="card card-flush space-y-4 p-5">
                      {event.coverImageUrl ? (
                        <CoverImage
                          src={event.coverImageUrl}
                          alt=""
                          className="-mx-5 -mt-5 h-40 w-[calc(100%+2.5rem)] sm:h-48"
                        />
                      ) : null}

                      <div className="flex gap-4">
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent">
                          <span className="text-[0.65rem] font-semibold uppercase tracking-wide">
                            {format.dateTime(event.startsAt, { month: "short" })}
                          </span>
                          <span className="text-lg font-semibold leading-none">
                            {format.dateTime(event.startsAt, { day: "numeric" })}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="font-semibold tracking-tight">
                              {event.title}
                            </h3>
                            <span className="meta">
                              {format.dateTime(event.startsAt, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>

                          {event.description ? (
                            <p className="text-sm leading-relaxed text-muted">
                              {event.description}
                            </p>
                          ) : null}

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="badge">
                              {event.priceCents === 0
                                ? common("free")
                                : formatMoney(
                                    event.priceCents,
                                    event.currency,
                                    locale,
                                  )}
                            </span>
                            <span
                              className={`badge ${
                                seatsLeft !== null && seatsLeft <= 5
                                  ? "badge-warning"
                                  : ""
                              }`}
                            >
                              {seatsLeft === null
                                ? common("unlimited")
                                : eventsT("seatsLeft", {
                                    count: seatsLeft,
                                    capacity: event.capacity ?? 0,
                                  })}
                            </span>
                            {event.location ? (
                              <span className="badge">
                                <svg
                                  aria-hidden
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.8}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-3.5 w-3.5"
                                >
                                  <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                                  <circle cx="12" cy="10" r="2.5" />
                                </svg>
                                {event.location}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {event.images.length > 0 ? (
                        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {event.images.map((image) => (
                            <li key={image.id}>
                              <CoverImage
                                src={image.url}
                                alt=""
                                className="h-20 w-full rounded-lg border border-line"
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {alreadyBooked ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="alert alert-success flex-1">
                            {eventsT("alreadyBooked")}
                          </p>
                          <Link
                            href={`/sites/${site.slug}/events/${event.id}/chat`}
                            className="btn-secondary btn-sm"
                          >
                            {chatT("openChat")}
                          </Link>
                        </div>
                      ) : seatsLeft === 0 ? (
                        <p className="alert alert-error">{eventsT("full")}</p>
                      ) : user ? (
                        <BookEventForm
                          eventId={event.id}
                          maxSeats={seatsLeft ?? 50}
                        />
                      ) : (
                        <Link href="/login" className="btn-secondary btn-sm">
                          {t("signInToBook")}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <section className="card space-y-3">
            <h2 className="section-title text-base">{t("practical")}</h2>
            <dl className="space-y-2.5 text-sm">
              {practical.map((row) => (
                <div
                  key={row.term}
                  className="flex justify-between gap-4 border-b border-line pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="text-muted">{row.term}</dt>
                  <dd className="text-right font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {site.latitude !== null && site.longitude !== null ? (
            <SiteLocationCard
              slug={site.slug}
              latitude={site.latitude}
              longitude={site.longitude}
              address={place || null}
            />
          ) : null}

          <section className="card space-y-4">
            <div>
              <h2 className="section-title text-base">{t("requestVisit")}</h2>
              <p className="hint">{t("requestVisitSubtitle")}</p>
            </div>

            {!user ? (
              <Link href="/login" className="btn-secondary w-full">
                {t("signInToRequest")}
              </Link>
            ) : pendingVisit ? (
              <p className="alert">{t("pendingVisitNotice")}</p>
            ) : (
              <VisitRequestForm siteId={site.id} />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
