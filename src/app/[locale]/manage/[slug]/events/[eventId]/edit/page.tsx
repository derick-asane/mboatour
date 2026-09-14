import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import {
  DeleteEventButton,
  EditEventForm,
} from "@/app/[locale]/manage/[slug]/events/[eventId]/event-clients";
import { SectionHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { loadManagedSite } from "@/server/manage";

/// Editing an event is its own page. It used to share one with the booking
/// list, which meant opening bookings put a long form in the way first.
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; eventId: string }>;
}) {
  const { locale, slug, eventId } = await params;
  setRequestLocale(locale);

  const { site, membership } = await loadManagedSite(slug, "MANAGE_EVENTS");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
    },
  });

  if (!event || event.siteId !== site.id) notFound();

  const t = await getTranslations("EventForm");
  const manage = await getTranslations("Manage");

  return (
    <div className="max-w-2xl space-y-5">
      <SectionHeader
        title={t("editTitle")}
        actions={
          can(membership, "MANAGE_BOOKINGS") ? (
            <Link
              href={`/manage/${slug}/events/${eventId}`}
              className="btn-secondary btn-sm"
            >
              {manage("bookings")}
            </Link>
          ) : null
        }
      />

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

      <div className="border-t border-line pt-5">
        <DeleteEventButton eventId={event.id} />
      </div>
    </div>
  );
}
