import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { CancelBookingButton, CancelVisitButton } from "@/app/[locale]/dashboard/cancel-buttons";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser("/dashboard");
  const t = await getTranslations("Dashboard");
  const members = await getTranslations("Members");
  const sitesT = await getTranslations("Sites");
  const chat = await getTranslations("Chat");
  const payments = await getTranslations("Payment");
  const bookingT = await getTranslations("Booking");
  const format = await getFormatter();

  const [memberships, bookings, visitRequests] = await Promise.all([
    prisma.siteMember.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { site: { select: { name: true, slug: true, published: true } } },
    }),
    prisma.booking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        payment: {
          select: {
            status: true,
            method: true,
            amountCents: true,
            currency: true,
            provider: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            site: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.visitRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { site: { select: { name: true, slug: true } } },
    }),
  ]);

  const stats = [
    { label: t("mySites"), value: memberships.length },
    { label: t("myBookings"), value: bookings.length },
    { label: t("myVisits"), value: visitRequests.length },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link href="/sites/new" className="btn-primary">
            {sitesT("createTitle")}
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <SectionHeader title={t("mySites")} />
        {memberships.length === 0 ? (
          <EmptyState
            title={t("mySitesEmpty")}
            action={
              <Link href="/sites/new" className="btn-secondary btn-sm">
                {sitesT("createTitle")}
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {memberships.map((membership) => (
              <li
                key={membership.id}
                className="card flex items-center gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">{membership.site.name}</p>
                  <p className="text-xs text-muted">
                    {membership.role === "OWNER"
                      ? members("owner")
                      : members("admin")}
                  </p>
                </div>
                {!membership.site.published ? (
                  <StatusBadge status="DRAFT" />
                ) : null}
                <Link
                  href={`/manage/${membership.site.slug}`}
                  className="btn-secondary btn-sm"
                >
                  {t("manage")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader title={t("myBookings")} />
        {bookings.length === 0 ? (
          <EmptyState title={t("myBookingsEmpty")} />
        ) : (
          <ul className="space-y-3">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="card flex flex-wrap items-center gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{booking.event.title}</p>
                  <p className="text-xs text-muted">
                    <Link
                      href={`/sites/${booking.event.site.slug}`}
                      className="link"
                    >
                      {booking.event.site.name}
                    </Link>
                    {" · "}
                    {format.dateTime(booking.event.startsAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="text-xs text-faint">
                    {t("reference")}: {booking.reference} · {booking.seats}
                  </p>
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
                </div>
                <StatusBadge status={booking.status} />
                {booking.status !== "CANCELLED" ? (
                  <>
                    <Link
                      href={`/sites/${booking.event.site.slug}/events/${booking.event.id}/chat`}
                      className="btn-secondary btn-sm"
                    >
                      {chat("openChat")}
                    </Link>
                    <CancelBookingButton bookingId={booking.id} />
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader title={t("myVisits")} />
        {visitRequests.length === 0 ? (
          <EmptyState title={t("myVisitsEmpty")} />
        ) : (
          <ul className="space-y-3">
            {visitRequests.map((request) => (
              <li
                key={request.id}
                className="card flex flex-wrap items-center gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">
                    <Link href={`/sites/${request.site.slug}`} className="link">
                      {request.site.name}
                    </Link>
                  </p>
                  <p className="text-xs text-muted">
                    {format.dateTime(request.visitDate, { dateStyle: "medium" })}{" "}
                    · {request.partySize}
                  </p>
                  {request.responseNote ? (
                    <p className="text-xs text-faint">{request.responseNote}</p>
                  ) : null}
                </div>
                <StatusBadge status={request.status} />
                {request.status === "PENDING" ? (
                  <CancelVisitButton requestId={request.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
