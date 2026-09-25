import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { BookingDecision } from "@/app/[locale]/manage/[slug]/events/[eventId]/event-clients";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/avatar";
import { SectionHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { loadManagedSite } from "@/server/manage";

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; eventId: string }>;
}) {
  const { locale, slug, eventId } = await params;
  setRequestLocale(locale);

  const { site, membership } = await loadManagedSite(slug);

  const mayEdit = can(membership, "MANAGE_EVENTS");
  const mayReview = can(membership, "MANAGE_BOOKINGS");

  if (!mayEdit && !mayReview) notFound();

  // This page is the booking list. Anyone who cannot see bookings belongs on
  // the form instead of an empty page.
  if (!mayReview) redirect(`/${locale}/manage/${slug}/events/${eventId}/edit`);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      bookings: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true, image: true } },
          payment: {
            select: {
              status: true,
              method: true,
              amountCents: true,
              currency: true,
              provider: true,
            },
          },
        },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, url: true },
      },
    },
  });

  if (!event || event.siteId !== site.id) notFound();

  const t = await getTranslations("Bookings");
  const formT = await getTranslations("EventForm");
  const format = await getFormatter();
  const payments = await getTranslations("Payment");
  const bookingT = await getTranslations("Booking");
  const chatT = await getTranslations("Chat");

  const bookedSeats = event.bookings
    .filter((booking) => booking.status !== "CANCELLED")
    .reduce((total, booking) => total + booking.seats, 0);

  return (
    <div className="space-y-10">
      {mayReview ? (
        <section className="space-y-4">
          <SectionHeader
            title={event.title}
            description={t("title")}
            actions={
              <>
                <span className="badge badge-accent">
                  {t("totalSeats", { count: bookedSeats })}
                </span>
                <Link
                  href={`/sites/${slug}/events/${eventId}/chat`}
                  className="btn-secondary btn-sm"
                >
                  {chatT("openChat")}
                </Link>
                {mayEdit ? (
                  <Link
                    href={`/manage/${slug}/events/${eventId}/edit`}
                    className="btn-secondary btn-sm"
                  >
                    {formT("editTitle")}
                  </Link>
                ) : null}
              </>
            }
          />

          {event.bookings.length === 0 ? (
            <EmptyState title={t("empty")} />
          ) : (
            <ul className="space-y-3">
              {event.bookings.map((booking) => {
                const who = booking.user.name ?? booking.user.email;

                return (
                  <li key={booking.id} className="card space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar
                        name={who}
                        imageUrl={booking.user.image}
                        title={booking.user.email}
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate font-medium">{who}</p>
                        <p className="text-xs text-muted">
                          <span className="font-mono">{booking.reference}</span>
                          {" · "}
                          {t("seats")}: {booking.seats}
                          {" · "}
                          {format.dateTime(booking.createdAt, {
                            dateStyle: "medium",
                          })}
                        </p>
                        {booking.attendeePhone ? (
                          <p className="text-xs text-muted">
                            {booking.attendeeName ?? who} · {booking.attendeePhone}
                          </p>
                        ) : null}
                        {booking.payment ? (
                          <p className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span
                              className={`badge ${
                                booking.payment.status === "PAID"
                                  ? "badge-success"
                                  : booking.payment.status === "FAILED"
                                    ? "badge-danger"
                                    : booking.payment.status === "REFUNDED"
                                      ? "badge-warning"
                                      : ""
                              }`}
                            >
                              {booking.payment.status === "PAID"
                                ? payments("paid")
                                : booking.payment.status === "FAILED"
                                  ? payments("failed")
                                  : booking.payment.status === "REFUNDED"
                                    ? payments("refunded")
                                    : payments("unpaid")}
                            </span>
                            <span className="text-muted">
                              {formatMoney(
                                booking.payment.amountCents,
                                booking.payment.currency,
                                locale,
                              )}
                              {" · "}
                              {bookingT(booking.payment.method)}
                            </span>
                            {/* Simulated charges are labelled wherever they appear, so a
                                test booking is never mistaken for money received. */}
                            {booking.payment.provider === "mock" ? (
                              <span className="badge badge-warning">{payments("simulated")}</span>
                            ) : null}
                          </p>
                        ) : null}
                        {booking.note ? (
                          <p className="text-xs text-faint">{booking.note}</p>
                        ) : null}
                      </div>

                      <StatusBadge status={booking.status} />
                    </div>

                    <BookingDecision
                      bookingId={booking.id}
                      status={booking.status}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
