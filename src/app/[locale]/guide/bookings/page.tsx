import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import {
  CancelGuideBooking,
  RespondToRequest,
} from "@/components/guides/guide-booking-controls";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

const TONES: Record<string, string> = {
  PENDING: "badge-warning",
  ACCEPTED: "badge-success",
  DECLINED: "badge-danger",
  CANCELLED: "badge-danger",
  COMPLETED: "",
};

/// A guide's own inbox: who wants them, when, and for where.
export default async function GuideBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser("/guide/bookings");
  const t = await getTranslations("GuideBooking");
  const chatT = await getTranslations("Chat");
  const format = await getFormatter();

  const profile = await prisma.guideProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title={t("inboxTitle")} description={t("inboxSubtitle")} />
        <EmptyState
          title={t("noProfile")}
          action={
            <Link href="/guide" className="btn-primary btn-sm">
              {t("createProfile")}
            </Link>
          }
        />
      </div>
    );
  }

  const bookings = await prisma.guideBooking.findMany({
    where: { guideId: profile.id },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
    include: {
      user: { select: { name: true, email: true } },
      sites: { include: { site: { select: { name: true, slug: true } } } },
      payment: { select: { status: true, amountCents: true, currency: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("inboxTitle")}
        description={t("inboxSubtitle")}
        actions={
          <Link href="/guide" className="btn-secondary btn-sm">
            {t("yourProfile")}
          </Link>
        }
      />

      {bookings.length === 0 ? (
        <EmptyState title={t("noRequests")} description={t("noRequestsHint")} />
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <li key={booking.id} className="card space-y-4">
              <div className="flex flex-wrap items-start gap-3">
                <span className="avatar shrink-0">
                  {(booking.user.name ?? booking.user.email).trim().charAt(0)}
                </span>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {booking.user.name ?? booking.user.email}
                    </p>
                    <span className={`badge ${TONES[booking.status] ?? ""}`}>
                      {t(booking.status)}
                    </span>
                    {booking.payment?.status === "PAID" ? (
                      <span className="badge badge-success">{t("paid")}</span>
                    ) : null}
                  </div>

                  <p className="text-sm text-muted">
                    {format.dateTime(booking.startDate, { dateStyle: "medium" })}
                    {booking.endDate
                      ? ` – ${format.dateTime(booking.endDate, { dateStyle: "medium" })}`
                      : ""}
                    {" · "}
                    {t("people", { count: booking.partySize })}
                    {" · "}
                    {formatMoney(booking.amountCents, booking.currency, locale)}
                  </p>

                  {booking.sites.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {booking.sites.map((entry) => (
                        <Link
                          key={entry.id}
                          href={`/sites/${entry.site.slug}`}
                          className="badge"
                        >
                          {entry.site.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  {booking.message ? (
                    <p className="text-sm leading-relaxed text-muted">
                      {booking.message}
                    </p>
                  ) : null}

                  {booking.responseNote ? (
                    <p className="text-xs text-faint">{booking.responseNote}</p>
                  ) : null}
                </div>
              </div>

              {booking.status === "ACCEPTED" || booking.status === "COMPLETED" ? (
                <Link
                  href={`/guide-bookings/${booking.id}/chat`}
                  className="btn-secondary btn-sm"
                >
                  {chatT("openChat")}
                </Link>
              ) : null}

              {booking.status === "PENDING" ? (
                <RespondToRequest bookingId={booking.id} />
              ) : booking.status === "ACCEPTED" ? (
                <CancelGuideBooking bookingId={booking.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
