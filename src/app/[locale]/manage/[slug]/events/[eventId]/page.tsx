import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import {
  BookingDecision,
  DeleteEventButton,
  EditEventForm,
} from "@/app/[locale]/manage/[slug]/events/[eventId]/event-clients";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
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

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      bookings: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
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

  const bookedSeats = event.bookings
    .filter((booking) => booking.status !== "CANCELLED")
    .reduce((total, booking) => total + booking.seats, 0);

  return (
    <div className="space-y-10">
      {mayEdit ? (
        <section className="max-w-2xl space-y-4">
          <SectionHeader title={formT("editTitle")} />
          <EditEventForm
            values={{
              id: event.id,
              title: event.title,
              description: event.description,
              location: event.location,
              coverImageUrl: event.coverImageUrl,
              images: event.images,
              startsAt: event.startsAt,
              endsAt: event.endsAt,
              capacity: event.capacity,
              priceCents: event.priceCents,
              currency: event.currency,
              status: event.status,
            }}
          />
          <DeleteEventButton eventId={event.id} />
        </section>
      ) : null}

      {mayReview ? (
        <section className="space-y-4">
          <SectionHeader
            title={t("title")}
            actions={
              <span className="badge badge-accent">
                {t("totalSeats", { count: bookedSeats })}
              </span>
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
                      <span className="avatar" title={booking.user.email}>
                        {who.trim().charAt(0) || "?"}
                      </span>

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
