"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isPaymentMethod, needsPhone, normalisePhone } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { failure, type ActionState } from "@/server/action-state";
import {
  sendGuideCancelledEmail,
  sendGuidePaidEmails,
  sendGuideRequestedEmail,
  sendGuideResponseEmail,
} from "@/server/email/notify";
import { paymentProvider } from "@/server/payments";
import { requireUser } from "@/server/session";

/// Dates in emails are plain ISO days: short, unambiguous, and the same in
/// every language the message might be read in.
function formatDateRange(start: Date, end: Date | null): string {
  const from = start.toISOString().slice(0, 10);

  return end ? `${from} – ${end.toISOString().slice(0, 10)}` : from;
}

/// Everything a guide-booking email needs, gathered once.
async function bookingContext(bookingId: string) {
  const booking = await prisma.guideBooking.findUnique({
    where: { id: bookingId },
    select: {
      startDate: true,
      endDate: true,
      partySize: true,
      amountCents: true,
      currency: true,
      user: { select: { name: true, email: true, locale: true } },
      guide: {
        select: {
          slug: true,
          user: { select: { name: true, email: true, locale: true } },
        },
      },
      sites: { select: { site: { select: { name: true } } } },
    },
  });

  if (!booking) return null;

  return {
    traveller: booking.user,
    guide: booking.guide.user,
    context: {
      guideName: booking.guide.user.name ?? booking.guide.user.email,
      guideSlug: booking.guide.slug,
      travellerName: booking.user.name ?? booking.user.email,
      dates: formatDateRange(booking.startDate, booking.endDate),
      partySize: booking.partySize,
      amountCents: booking.amountCents,
      currency: booking.currency,
      sites: booking.sites.map((entry) => entry.site.name),
    },
  };
}

const requestSchema = z.object({
  guideId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z
    .union([z.coerce.date(), z.literal("")])
    .optional()
    .transform((value) => (value instanceof Date ? value : null)),
  partySize: z.coerce.number().int().min(1).max(200),
  amount: z.coerce.number().min(0).max(10_000_000),
  message: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value ? value : null)),
});

/// A traveller asks a guide to take them out, possibly across several sites.
export async function requestGuideAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = requestSchema.safeParse({
    guideId: formData.get("guideId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    partySize: formData.get("partySize") || 1,
    amount: formData.get("amount") || 0,
    message: formData.get("message") ?? undefined,
  });

  if (!parsed.success) return failure("invalidInput");

  const { guideId, startDate, endDate, partySize, amount, message } = parsed.data;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (startDate < startOfToday) return failure("dateInPast");
  if (endDate && endDate < startDate) return failure("endBeforeStart");

  const guide = await prisma.guideProfile.findUnique({
    where: { id: guideId },
    select: {
      id: true,
      slug: true,
      status: true,
      currency: true,
      userId: true,
      user: { select: { name: true, email: true, locale: true } },
    },
  });

  if (!guide || guide.status !== "VERIFIED") return failure("guideNotAvailable");
  if (guide.userId === user.id) return failure("cannotBookYourself");

  const siteIds = formData
    .getAll("siteIds")
    .map((value) => String(value))
    .filter(Boolean);

  // Only real, published sites, so a request cannot name somewhere private.
  const sites = await prisma.touristicSite.findMany({
    where: { id: { in: siteIds }, published: true },
    select: { id: true, name: true },
  });

  const amountCents = Math.round(amount * 100);

  await prisma.guideBooking.create({
    data: {
      guideId: guide.id,
      userId: user.id,
      startDate,
      endDate,
      partySize,
      message,
      amountCents,
      currency: guide.currency,
      sites: { create: sites.map((site) => ({ siteId: site.id })) },
    },
  });

  await sendGuideRequestedEmail(guide.user, {
    guideName: guide.user.name ?? guide.user.email,
    guideSlug: guide.slug,
    travellerName: user.name ?? user.email,
    dates: formatDateRange(startDate, endDate),
    partySize,
    amountCents,
    currency: guide.currency,
    sites: sites.map((site) => site.name),
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/guide/bookings`);

  return { success: "guideRequested" };
}

const responseSchema = z.object({
  bookingId: z.string().min(1),
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
});

/// The guide answers. Nothing is charged until they accept, so a decline costs
/// the traveller nothing to undo.
export async function respondToGuideBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = responseSchema.safeParse({
    bookingId: formData.get("bookingId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) return failure("invalidInput");

  const booking = await prisma.guideBooking.findUnique({
    where: { id: parsed.data.bookingId },
    select: { id: true, status: true, guide: { select: { userId: true } } },
  });

  if (!booking) return failure("bookingNotFound");
  if (booking.guide.userId !== user.id) return failure("forbidden");
  if (booking.status !== "PENDING") return failure("alreadyAnswered");

  await prisma.guideBooking.update({
    where: { id: booking.id },
    data: {
      status: parsed.data.decision,
      responseNote: parsed.data.note,
      respondedAt: new Date(),
    },
  });

  const details = await bookingContext(booking.id);

  if (details) {
    await sendGuideResponseEmail(
      details.traveller,
      details.context,
      parsed.data.decision,
      parsed.data.note,
    );
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/guide/bookings`);
  revalidatePath(`/${locale}/dashboard`);

  return { success: parsed.data.decision === "ACCEPTED" ? "guideAccepted" : "guideDeclined" };
}

const paySchema = z.object({
  bookingId: z.string().min(1),
  method: z.string().trim(),
  payerPhone: z.string().trim().optional(),
  cardLast4: z.string().trim().optional(),
});

/// Pays the guide. The money goes to the guide's own mobile money number: the
/// platform records the payment and never holds it, which is also why there is
/// no refund here to give.
export async function payGuideBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = paySchema.safeParse({
    bookingId: formData.get("bookingId"),
    method: formData.get("method"),
    payerPhone: formData.get("payerPhone") || undefined,
    cardLast4: formData.get("cardLast4") || undefined,
  });

  if (!parsed.success) return failure("invalidInput");
  if (!isPaymentMethod(parsed.data.method)) return failure("paymentMethodRequired");

  const method = parsed.data.method;

  const booking = await prisma.guideBooking.findUnique({
    where: { id: parsed.data.bookingId },
    select: {
      id: true,
      userId: true,
      status: true,
      amountCents: true,
      currency: true,
      payment: { select: { id: true, status: true } },
      guide: { select: { phone: true, whatsapp: true, slug: true } },
    },
  });

  if (!booking || booking.userId !== user.id) return failure("bookingNotFound");
  if (booking.status !== "ACCEPTED") return failure("notAcceptedYet");
  if (booking.payment?.status === "PAID") return failure("alreadyPaid");
  if (booking.amountCents <= 0) return failure("nothingToPay");

  let payerPhone: string | null = null;

  if (needsPhone(method)) {
    payerPhone = parsed.data.payerPhone
      ? normalisePhone(parsed.data.payerPhone)
      : null;

    if (!payerPhone) return failure("invalidPhone");
  }

  // Where the money lands: the guide's own number, not an account of ours.
  const payeeRef = booking.guide.phone ?? booking.guide.whatsapp;

  if (!payeeRef) return failure("guideHasNoNumber");

  const provider = paymentProvider();
  const result = await provider.charge({
    amountCents: booking.amountCents,
    currency: booking.currency,
    method,
    phone: payerPhone,
    cardLast4: parsed.data.cardLast4 ?? null,
    reference: booking.id,
  });

  const paid = result.status === "PAID";

  const record = {
    amountCents: booking.amountCents,
    currency: booking.currency,
    method,
    status: result.status,
    provider: provider.name,
    payee: "GUIDE" as const,
    payeeRef,
    providerRef: paid ? result.providerRef : null,
    failureCode: paid ? null : result.failureCode,
    payerPhone,
    cardLast4: parsed.data.cardLast4 ?? null,
    paidAt: paid ? new Date() : null,
  };

  await prisma.payment.upsert({
    where: { guideBookingId: booking.id },
    create: { ...record, guideBookingId: booking.id },
    update: record,
  });

  if (!paid) return failure("paymentDeclined");

  const details = await bookingContext(booking.id);

  if (details) {
    await sendGuidePaidEmails(details.guide, details.traveller, details.context);
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/guide/bookings`);

  return { success: "guidePaid" };
}

/// Either side calls the arrangement off. Money already sent to the guide is
/// between the two of them: the platform never held it and cannot return it.
export async function cancelGuideBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");

  const booking = await prisma.guideBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      status: true,
      payment: { select: { status: true } },
      guide: { select: { userId: true } },
    },
  });

  if (!booking) return failure("bookingNotFound");

  const isTraveller = booking.userId === user.id;
  const isGuide = booking.guide.userId === user.id;

  if (!isTraveller && !isGuide) return failure("forbidden");
  if (booking.status === "CANCELLED") return {};

  await prisma.guideBooking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
  });

  const details = await bookingContext(booking.id);

  if (details) {
    // Whoever did not press the button is the one who needs telling.
    await sendGuideCancelledEmail(
      isTraveller ? details.guide : details.traveller,
      details.context,
      isTraveller ? "TRAVELLER" : "GUIDE",
      booking.payment?.status === "PAID",
    );
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/guide/bookings`);

  return { success: "guideBookingCancelled" };
}
