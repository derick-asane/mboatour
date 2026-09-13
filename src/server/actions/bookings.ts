"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hasEnded } from "@/lib/events";
import {
  isPaymentMethod,
  needsCard,
  needsPhone,
  normalisePhone,
} from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { bookingReference } from "@/lib/slug";
import { failure, type ActionState } from "@/server/action-state";
import {
  sendBookingCreatedEmails,
  sendBookingDecisionEmail,
} from "@/server/email/notify";
import { paymentProvider } from "@/server/payments";
import { PermissionError, requirePermission, requireUser } from "@/server/session";

const bookingSchema = z.object({
  eventId: z.string().min(1),
  seats: z.coerce.number().int().min(1).max(50),
  attendeeName: z.string().trim().min(2).max(80),
  // Kept for every booking: the team needs a way to reach the attendee, and
  // mobile money needs a number to push the prompt to.
  attendeePhone: z.string().trim().min(6).max(20),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || null),
  method: z.string().trim().optional(),
  payerPhone: z.string().trim().optional(),
  // The browser keeps the card number and sends only these four digits.
  cardLast4: z.string().trim().regex(/^\d{4}$/).optional(),
});

/// Seats already committed against an event's capacity.
function takenSeats(bookings: { seats: number; status: string }[]): number {
  return bookings
    .filter((booking) => booking.status !== "CANCELLED")
    .reduce((total, booking) => total + booking.seats, 0);
}

export async function bookEventAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = bookingSchema.safeParse({
    eventId: formData.get("eventId"),
    seats: formData.get("seats") || 1,
    attendeeName: formData.get("attendeeName"),
    attendeePhone: formData.get("attendeePhone"),
    note: formData.get("note") ?? undefined,
    method: formData.get("method") ?? undefined,
    payerPhone: formData.get("payerPhone") ?? undefined,
    cardLast4: formData.get("cardLast4") ?? undefined,
  });

  if (!parsed.success) return failure("invalidInput");

  const { eventId, seats, note, attendeeName, attendeePhone } = parsed.data;

  const contactPhone = normalisePhone(attendeePhone);

  if (!contactPhone) return failure("invalidPhone");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      capacity: true,
      startsAt: true,
      endsAt: true,
      priceCents: true,
      currency: true,
      title: true,
      siteId: true,
      site: { select: { slug: true, name: true } },
    },
  });

  if (!event) return failure("eventNotFound");
  if (event.status !== "PUBLISHED") return failure("eventNotBookable");
  // Only a finished event is too late to book.
  if (hasEnded(event)) return failure("eventPast");

  const amountCents = event.priceCents * seats;
  const payable = amountCents > 0;

  // A paid event needs a method; a free one takes no payment details at all.
  const method =
    payable && parsed.data.method && isPaymentMethod(parsed.data.method)
      ? parsed.data.method
      : null;

  if (payable && !method) return failure("paymentMethodRequired");

  let payerPhone: string | null = null;

  if (method && needsPhone(method)) {
    payerPhone = normalisePhone(parsed.data.payerPhone ?? attendeePhone);

    if (!payerPhone) return failure("invalidPhone");
  }

  if (method && needsCard(method) && !parsed.data.cardLast4) {
    return failure("invalidCard");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
        select: { id: true, status: true },
      });

      if (existing && existing.status !== "CANCELLED") {
        throw new Error("alreadyBooked");
      }

      if (event.capacity !== null) {
        const siblings = await tx.booking.findMany({
          where: { eventId, NOT: { userId: user.id } },
          select: { seats: true, status: true },
        });

        if (takenSeats(siblings) + seats > event.capacity) {
          throw new Error("eventFull");
        }
      }

      if (existing) {
        await tx.booking.update({
          where: { id: existing.id },
          data: {
            seats,
            note,
            attendeeName,
            attendeePhone: contactPhone,
            status: "PENDING",
          },
        });
        return;
      }

      await tx.booking.create({
        data: {
          eventId,
          userId: user.id,
          seats,
          note,
          attendeeName,
          attendeePhone: contactPhone,
          reference: bookingReference(),
          status: "PENDING",
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (["alreadyBooked", "eventFull"].includes(message)) return failure(message);
    throw error;
  }

  const saved = await prisma.booking.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
    select: { id: true, reference: true, user: { select: { email: true, locale: true } } },
  });

  // Charge after the seat is held, so nobody pays for a seat they did not get.
  if (saved && method) {
    const provider = paymentProvider();
    const result = await provider.charge({
      amountCents,
      currency: event.currency,
      method,
      phone: payerPhone,
      cardLast4: parsed.data.cardLast4 ?? null,
      reference: saved.reference,
    });

    const paid = result.status === "PAID";

    await prisma.payment.upsert({
      where: { bookingId: saved.id },
      create: {
        bookingId: saved.id,
        amountCents,
        currency: event.currency,
        method,
        status: result.status,
        provider: provider.name,
        providerRef: paid ? result.providerRef : null,
        failureCode: paid ? null : result.failureCode,
        payerPhone,
        cardLast4: parsed.data.cardLast4 ?? null,
        paidAt: paid ? new Date() : null,
      },
      update: {
        amountCents,
        currency: event.currency,
        method,
        status: result.status,
        providerRef: paid ? result.providerRef : null,
        failureCode: paid ? null : result.failureCode,
        payerPhone,
        cardLast4: parsed.data.cardLast4 ?? null,
        paidAt: paid ? new Date() : null,
      },
    });

    if (!paid) {
      // The seat stays held as an unpaid booking, so they can try again.
      return failure("paymentDeclined");
    }

    // Money settled, so there is nothing left for the team to confirm.
    await prisma.booking.update({
      where: { id: saved.id },
      data: { status: "CONFIRMED" },
    });
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/sites/${event.site.slug}`);
  revalidatePath(`/${locale}/dashboard`);

  if (saved) {
    await sendBookingCreatedEmails(
      saved.user,
      {
        siteName: event.site.name,
        siteSlug: event.site.slug,
        eventTitle: event.title,
        startsAt: event.startsAt.toISOString().slice(0, 16).replace("T", " "),
        seats,
        reference: saved.reference,
      },
      event.siteId,
    );
  }

  return { success: "bookingCreated" };
}

export async function cancelOwnBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, userId: true },
  });

  if (!booking || booking.userId !== user.id) return failure("bookingNotFound");

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard`);

  return { success: "bookingCancelled" };
}

/// Site admins with MANAGE_BOOKINGS confirm or cancel a booking.
export async function decideBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!["CONFIRMED", "CANCELLED", "PENDING"].includes(decision)) {
    return failure("invalidInput");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      seats: true,
      reference: true,
      user: { select: { email: true, locale: true } },
      event: {
        select: {
          id: true,
          siteId: true,
          title: true,
          startsAt: true,
          site: { select: { slug: true, name: true } },
        },
      },
    },
  });

  if (!booking) return failure("bookingNotFound");

  try {
    await requirePermission(user.id, booking.event.siteId, "MANAGE_BOOKINGS");
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: decision as "CONFIRMED" | "CANCELLED" | "PENDING" },
  });

  await sendBookingDecisionEmail(
    booking.user,
    {
      siteName: booking.event.site.name,
      siteSlug: booking.event.site.slug,
      eventTitle: booking.event.title,
      startsAt: booking.event.startsAt.toISOString().slice(0, 16).replace("T", " "),
      seats: booking.seats,
      reference: booking.reference,
    },
    decision as "CONFIRMED" | "CANCELLED" | "PENDING",
  );

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/manage/${booking.event.site.slug}/events/${booking.event.id}`,
  );

  return { success: "bookingUpdated" };
}
