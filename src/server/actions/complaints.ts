"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { failure, type ActionState } from "@/server/action-state";
import {
  canComplainAboutGuide,
  COMPLAINT_REASONS,
  MAX_COMPLAINT_LENGTH,
  MIN_COMPLAINT_LENGTH,
} from "@/server/complaints";
import {
  sendComplaintDecisionEmails,
  sendComplaintFiledEmails,
} from "@/server/email/notify";
import { requireUser } from "@/server/session";

const fileSchema = z.object({
  guideId: z.string().min(1),
  bookingId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  reason: z.enum(COMPLAINT_REASONS),
  body: z.string().trim().min(MIN_COMPLAINT_LENGTH).max(MAX_COMPLAINT_LENGTH),
});

/// A traveller reports a guide to the platform. Nothing about this is public:
/// it is not written to the guide's profile, does not touch their rating, and
/// the guide is not told who complained.
export async function fileComplaintAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = fileSchema.safeParse({
    guideId: formData.get("guideId"),
    bookingId: formData.get("bookingId") ?? undefined,
    reason: formData.get("reason"),
    body: formData.get("body"),
  });

  if (!parsed.success) return failure("complaintTooShort");

  const { guideId, bookingId, reason, body } = parsed.data;

  const guide = await prisma.guideProfile.findUnique({
    where: { id: guideId },
    select: {
      id: true,
      userId: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!guide) return failure("guideProfileMissing");

  const eligibility = await canComplainAboutGuide(user.id, guide);

  if (!eligibility.allowed) return failure(eligibility.reason);

  // A booking named in the form still has to be this traveller's, with this
  // guide: the id arrives from the browser like anything else.
  let outing: string | null = null;

  if (bookingId) {
    const booking = await prisma.guideBooking.findFirst({
      where: { id: bookingId, guideId, userId: user.id },
      select: { id: true },
    });

    if (!booking) return failure("bookingMissing");

    outing = booking.id;
  }

  const complaint = await prisma.guideComplaint.create({
    data: { guideId, userId: user.id, bookingId: outing, reason, body },
    select: { id: true, reason: true, body: true, createdAt: true },
  });

  // Whoever is on duty needs to know something is waiting; a complaint nobody
  // reads is the same as no complaint at all.
  const admins = await prisma.user.findMany({
    where: { platformRole: { not: "MEMBER" } },
    select: { email: true, locale: true },
  });

  await sendComplaintFiledEmails(admins, {
    complaintId: complaint.id,
    reason: complaint.reason,
    body: complaint.body,
    guideName: guide.user.name ?? guide.user.email,
    travellerName: user.name ?? user.email,
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/admin/complaints`);
  revalidatePath(`/${locale}/admin`);

  return { success: "complaintFiled" };
}

const decisionSchema = z.object({
  complaintId: z.string().min(1),
  status: z.enum(["REVIEWING", "RESOLVED", "DISMISSED"]),
  outcome: z.enum(["NO_ACTION", "WARNED", "SUSPENDED"]).optional(),
  resolution: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value ? value : null)),
});

/// The platform team's decision. Picking up a complaint is not yet a decision,
/// so `REVIEWING` records only that somebody is on it; closing one has to say
/// what was concluded.
export async function decideComplaintAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  if (!isPlatformAdmin(user.platformRole)) return failure("forbidden");

  const parsed = decisionSchema.safeParse({
    complaintId: formData.get("complaintId"),
    status: formData.get("status"),
    outcome: formData.get("outcome") ?? undefined,
    resolution: formData.get("resolution") ?? undefined,
  });

  if (!parsed.success) return failure("invalidInput");

  const { complaintId, status, outcome, resolution } = parsed.data;

  const closing = status === "RESOLVED" || status === "DISMISSED";

  // Closing a complaint without saying what came of it would leave no record of
  // whether the guide was cleared or punished.
  if (closing && !outcome) return failure("outcomeRequired");

  const complaint = await prisma.guideComplaint.findUnique({
    where: { id: complaintId },
    select: {
      id: true,
      status: true,
      guideId: true,
      guide: {
        select: {
          slug: true,
          status: true,
          user: { select: { name: true, email: true, locale: true } },
        },
      },
      user: { select: { email: true, locale: true } },
    },
  });

  if (!complaint) return failure("complaintMissing");

  if (complaint.status === "RESOLVED" || complaint.status === "DISMISSED") {
    return failure("complaintClosed");
  }

  await prisma.guideComplaint.update({
    where: { id: complaintId },
    data: {
      status,
      outcome: closing ? outcome : null,
      resolution,
      reviewedAt: closing ? new Date() : null,
      reviewedById: user.id,
    },
  });

  // Suspension is the one outcome that changes anything outside this table: the
  // profile leaves the directory until the team lifts it.
  if (closing && outcome === "SUSPENDED") {
    await prisma.guideProfile.update({
      where: { id: complaint.guideId },
      data: { status: "SUSPENDED", reviewNote: resolution },
    });
  }

  if (closing) {
    // The guide hears the outcome but never who reported them: a traveller who
    // reports a guide they may still have to meet should not be handed over.
    await sendComplaintDecisionEmails(
      complaint.guide.user,
      complaint.user,
      {
        outcome: outcome!,
        resolution,
        dismissed: status === "DISMISSED",
      },
    );
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/complaints`);
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/guides`);
  revalidatePath(`/${locale}/guides`);
  revalidatePath(`/${locale}/guides/${complaint.guide.slug}`);
  revalidatePath(`/${locale}/dashboard`);

  return { success: "complaintDecided" };
}
