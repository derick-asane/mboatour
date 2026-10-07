import { getFormatter, getTranslations } from "next-intl/server";

import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { prismaBookingInclude } from "@/server/receipts/include";
import { renderReceiptPdf, type Line } from "@/server/receipts/pdf";
import { getCurrentUser, getMembership } from "@/server/session";

/// The receipt for one booking. It is a record of what was agreed and what was
/// paid, so it is built from the booking itself every time rather than stored:
/// a refund afterwards has to show on it, and a file written at the moment of
/// payment never would.

export type ReceiptResult =
  | { ok: true; pdf: Uint8Array; filename: string }
  | { ok: false; status: 401 | 403 | 404 };

export async function buildBookingReceipt(
  reference: string,
  locale: string,
): Promise<ReceiptResult> {
  const user = await getCurrentUser();

  if (!user) return { ok: false, status: 401 };

  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: prismaBookingInclude,
  });

  if (!booking) return { ok: false, status: 404 };

  // The person who booked, or the team who have to answer for the event.
  const mine = booking.userId === user.id;
  const membership = mine
    ? null
    : await getMembership(user.id, booking.event.siteId);

  if (!mine && !can(membership, "MANAGE_BOOKINGS")) {
    return { ok: false, status: 403 };
  }

  const t = await getTranslations({ locale, namespace: "Receipt" });
  const events = await getTranslations({ locale, namespace: "Events" });
  const payments = await getTranslations({ locale, namespace: "Payment" });
  const bookingT = await getTranslations({ locale, namespace: "Booking" });
  const common = await getTranslations({ locale, namespace: "Common" });
  const format = await getFormatter({ locale });

  const payment = booking.payment;
  const amountCents = payment?.amountCents ?? 0;
  const currency = payment?.currency ?? booking.event.currency;

  const paymentStatus = payment
    ? payment.status === "PAID"
      ? payments("paid")
      : payment.status === "REFUNDED"
        ? payments("refunded")
        : payment.status === "FAILED"
          ? payments("failed")
          : payments("unpaid")
    : t("noPayment");

  const method = payment ? bookingT(payment.method) : null;

  const row = (label: string, value: string): Line[] => [
    { type: "text", text: label, size: 8.5, grey: true },
    { type: "text", text: value, size: 11 },
    { type: "space", height: 6 },
  ];

  const lines: Line[] = [
    { type: "text", text: "MBOA TOUR", size: 22, bold: true },
    { type: "text", text: t("title"), size: 11, grey: true },
    { type: "space", height: 4 },
    { type: "rule" },

    ...row(t("reference"), booking.reference),
    ...row(t("issued"), format.dateTime(new Date(), { dateStyle: "long" })),
    ...row(
      t("status"),
      booking.status === "CANCELLED" ? t("cancelled") : t("confirmed"),
    ),

    { type: "space", height: 6 },
    { type: "rule" },
    { type: "text", text: t("bookedBy"), size: 8.5, grey: true },
    {
      type: "text",
      text: booking.attendeeName ?? booking.user.name ?? booking.user.email,
      size: 11,
    },
    { type: "text", text: booking.user.email, size: 10, grey: true },
    ...(booking.attendeePhone
      ? [{ type: "text" as const, text: booking.attendeePhone, size: 10, grey: true }]
      : []),

    { type: "space", height: 10 },
    { type: "rule" },
    { type: "text", text: booking.event.title, size: 14, bold: true },
    { type: "text", text: booking.event.site.name, size: 10, grey: true },
    { type: "space", height: 4 },
    ...row(
      events("startsAt"),
      format.dateTime(booking.event.startsAt, {
        dateStyle: "full",
        timeStyle: "short",
      }),
    ),
    ...(booking.event.location
      ? row(t("location"), booking.event.location)
      : []),
    ...row(events("seats"), String(booking.seats)),

    { type: "space", height: 6 },
    { type: "rule" },
    { type: "text", text: t("payment"), size: 8.5, grey: true },
    { type: "space", height: 2 },
    {
      type: "text",
      text: method ? `${method} — ${paymentStatus}` : paymentStatus,
      size: 11,
    },
    {
      type: "right",
      text: amountCents > 0 ? formatMoney(amountCents, currency, locale) : t("free"),
      size: 15,
      bold: true,
    },
  ];

  if (payment?.cardLast4) {
    lines.push({ type: "text", text: t("cardEnding", { last4: payment.cardLast4 }), size: 9, grey: true });
  }

  if (payment?.payerPhone) {
    lines.push({ type: "text", text: payment.payerPhone, size: 9, grey: true });
  }

  if (payment?.paidAt) {
    lines.push({
      type: "text",
      text: t("paidOn", {
        date: format.dateTime(payment.paidAt, { dateStyle: "long", timeStyle: "short" }),
      }),
      size: 9,
      grey: true,
    });
  }

  // A refund belongs on the receipt: it is the same transaction, undone.
  if (payment?.refundedAt) {
    lines.push({
      type: "text",
      text: t("refundedOn", {
        date: format.dateTime(payment.refundedAt, { dateStyle: "long", timeStyle: "short" }),
      }),
      size: 9,
      grey: true,
    });
  }

  if (payment?.providerRef) {
    lines.push({
      type: "text",
      text: t("providerRef", { ref: payment.providerRef }),
      size: 9,
      grey: true,
    });
  }

  lines.push(
    { type: "space", height: 14 },
    { type: "rule" },
    { type: "text", text: t("footer", { appName: common("appName") }), size: 8.5, grey: true },
  );

  return {
    ok: true,
    pdf: renderReceiptPdf(lines, `${t("title")} ${booking.reference}`),
    filename: `mboatour-${booking.reference}.pdf`,
  };
}
