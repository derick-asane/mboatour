"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { bookingReference } from "@/lib/slug";
import { failure, type ActionState } from "@/server/action-state";
import {
  sendBookingCreatedEmails,
  sendBookingDecisionEmail,
} from "@/server/email/notify";
import { PermissionError, requirePermission, requireUser } from "@/server/session";

const bookingSchema = z.object({
  eventId: z.string().min(1),
  seats: z.coerce.number().int().min(1).max(50),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || null),
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
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) return failure("invalidInput");

  const { eventId, seats, note } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      capacity: true,
      startsAt: true,
      title: true,
      siteId: true,
      site: { select: { slug: true, name: true } },
    },
  });

  if (!event) return failure("eventNotFound");
  if (event.status !== "PUBLISHED") return failure("eventNotBookable");
  if (event.startsAt.getTime() < Date.now()) return failure("eventPast");

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
          data: { seats, note, status: "PENDING" },
        });
        return;
      }

      await tx.booking.create({
        data: {
          eventId,
          userId: user.id,
          seats,
          note,
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

  const locale = await getLocale();
  revalidatePath(`/${locale}/sites/${event.site.slug}`);
  revalidatePath(`/${locale}/dashboard`);

  const saved = await prisma.booking.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
    select: { reference: true, user: { select: { email: true, locale: true } } },
  });

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
