import { prisma } from "@/lib/prisma";

/// Who may complain about a guide, and about what. A review needs a finished,
/// paid outing because it speaks about quality in public. A complaint needs
/// less: being left waiting, or never being taken anywhere after paying, is
/// exactly the case where the outing never properly happened. So the test is
/// that the two had an arrangement at all — the guide answered a request — not
/// that it went well enough to rate.

export {
  COMPLAINT_REASONS,
  MAX_COMPLAINT_LENGTH,
  MIN_COMPLAINT_LENGTH,
  isComplaintReason,
  type ComplaintReason,
} from "@/lib/complaints";

export type ComplaintEligibility =
  | { allowed: true }
  | {
      allowed: false;
      reason: "signedOut" | "ownProfile" | "noDealings" | "alreadyOpen";
    };

/// An open complaint is still being dealt with, so a second one about the same
/// guide would only split the evidence. Once it is closed, a fresh incident may
/// be raised.
export async function canComplainAboutGuide(
  userId: string | null,
  guide: { id: string; userId: string },
): Promise<ComplaintEligibility> {
  if (!userId) return { allowed: false, reason: "signedOut" };

  if (userId === guide.userId) return { allowed: false, reason: "ownProfile" };

  const dealing = await prisma.guideBooking.findFirst({
    // A request the guide never answered is not a dealing: there is nothing to
    // complain about yet, and it would let anyone accuse any guide by asking.
    where: { guideId: guide.id, userId, status: { not: "PENDING" } },
    select: { id: true },
  });

  if (!dealing) return { allowed: false, reason: "noDealings" };

  const open = await prisma.guideComplaint.findFirst({
    where: { guideId: guide.id, userId, status: { in: ["OPEN", "REVIEWING"] } },
    select: { id: true },
  });

  return open ? { allowed: false, reason: "alreadyOpen" } : { allowed: true };
}

/// The bookings this traveller could be complaining about, newest first, so the
/// form can ask which outing it concerns.
export async function listComplainableBookings(
  userId: string,
  guideId: string,
): Promise<{ id: string; startDate: Date; endDate: Date | null }[]> {
  return prisma.guideBooking.findMany({
    where: { guideId, userId, status: { not: "PENDING" } },
    orderBy: { startDate: "desc" },
    select: { id: true, startDate: true, endDate: true },
  });
}
