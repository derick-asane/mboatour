import { prisma } from "@/lib/prisma";

/// A guide takes money from strangers, so the proof needed to rate one is at
/// least as strong as for a site: the outing must have been paid for and be
/// over. Nobody can rate a guide they merely enquired with.

export type GuideReviewEligibility =
  | { allowed: true }
  | { allowed: false; reason: "signedOut" | "notBeenYet" | "ownProfile" };

export async function canReviewGuide(
  userId: string | null,
  guide: { id: string; userId: string },
): Promise<GuideReviewEligibility> {
  if (!userId) return { allowed: false, reason: "signedOut" };

  // Rating yourself would be worse than useless.
  if (userId === guide.userId) return { allowed: false, reason: "ownProfile" };

  const now = new Date();

  const outing = await prisma.guideBooking.findFirst({
    where: {
      guideId: guide.id,
      userId,
      status: { in: ["ACCEPTED", "COMPLETED"] },
      payment: { status: "PAID" },
      OR: [{ endDate: { lt: now } }, { endDate: null, startDate: { lt: now } }],
    },
    select: { id: true },
  });

  return outing
    ? { allowed: true }
    : { allowed: false, reason: "notBeenYet" };
}

/// Recomputes what the directory reads. A hidden review counts for nothing: a
/// rating nobody may read should not move the average either.
export async function refreshGuideRating(guideId: string): Promise<void> {
  const summary = await prisma.guideReview.aggregate({
    where: { guideId, hiddenAt: null },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.guideProfile.update({
    where: { id: guideId },
    data: {
      ratingAverage: summary._count._all > 0 ? summary._avg.rating : null,
      ratingCount: summary._count._all,
    },
  });
}
