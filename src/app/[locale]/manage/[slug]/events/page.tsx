import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "@/i18n/navigation";
import { hasEnded, isRunning } from "@/lib/events";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { loadManagedSite } from "@/server/manage";

export default async function ManageEventsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { site, membership } = await loadManagedSite(slug);
  const t = await getTranslations("Manage");
  const eventsT = await getTranslations("Events");
  const formT = await getTranslations("EventForm");
  const bookingsT = await getTranslations("Bookings");
  const format = await getFormatter();

  const mayCreate = can(membership, "MANAGE_EVENTS");

  const events = await prisma.event.findMany({
    where: { siteId: site.id },
    orderBy: { startsAt: "desc" },
    include: {
      _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } },
    },
  });

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t("events")}
        actions={
          mayCreate ? (
            <Link href={`/manage/${slug}/events/new`} className="btn-primary">
              {formT("create")}
            </Link>
          ) : null
        }
      />

      {events.length === 0 ? (
        <EmptyState
          title={eventsT("empty")}
          action={
            mayCreate ? (
              <Link
                href={`/manage/${slug}/events/new`}
                className="btn-secondary btn-sm"
              >
                {formT("create")}
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="card flex flex-wrap items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-line surface-muted">
                <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted">
                  {format.dateTime(event.startsAt, { month: "short" })}
                </span>
                <span className="text-base font-semibold leading-none">
                  {format.dateTime(event.startsAt, { day: "numeric" })}
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium">{event.title}</p>
                <p className="text-xs text-muted">
                  {format.dateTime(event.startsAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {" · "}
                  {bookingsT("title")}: {event._count.bookings}
                </p>
              </div>

              {hasEnded(event) ? (
                <span className="badge" title={eventsT("endedHint")}>
                  {eventsT("ended")}
                </span>
              ) : isRunning(event) ? (
                <span className="badge badge-warning">{eventsT("running")}</span>
              ) : null}

              <StatusBadge status={event.status} />

              <Link
                href={`/manage/${slug}/events/${event.id}`}
                className="btn-secondary btn-sm"
              >
                {t("bookings")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
