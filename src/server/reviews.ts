import { prisma } from "@/lib/prisma";
import { MAX_RATING, MIN_RATING } from "@/lib/reviews";

/// A rating is only worth reading if the person was actually there, so the
/// right to leave one is derived from what they did, never granted directly.

export { MAX_RATING, MIN_RATING };

export type ReviewEligibility =
  | { allowed: true }
  /// Why not, so the page can say something better than "no".
  | { allowed: false; reason: "notBeenYet" | "signedOut" | "ownSite" };

export async function canReviewSite(
  userId: string | null,
  siteId: string,
): Promise<ReviewEligibility> {
  if (!userId) return { allowed: false, reason: "signedOut" };

  // Rating the site you run is not a review of anything. The same reasoning
  // already blocks a guide from rating themselves.
  const membership = await prisma.siteMember.findUnique({
    where: { userId_siteId: { userId, siteId } },
    select: { id: true },
  });

  if (membership) return { allowed: false, reason: "ownSite" };

  const now = new Date();

  const [attended, visited] = await Promise.all([
    // A booking that was not cancelled, on an event that has finished.
    prisma.booking.findFirst({
      where: {
        userId,
        status: { not: "CANCELLED" },
        event: {
          siteId,
          OR: [
            { endsAt: { lt: now } },
            { endsAt: null, startsAt: { lt: now } },
          ],
        },
      },
      select: { id: true },
    }),
    prisma.visitRequest.findFirst({
      where: { userId, siteId, status: "APPROVED", visitDate: { lt: now } },
      select: { id: true },
    }),
  ]);

  return attended || visited
    ? { allowed: true }
    : { allowed: false, reason: "notBeenYet" };
}

/// Recomputes the numbers kept on the site. Hidden reviews count for nothing:
/// a rating nobody may read should not move the average either.
export async function refreshSiteRating(siteId: string): Promise<void> {
  const summary = await prisma.review.aggregate({
    where: { siteId, hiddenAt: null },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.touristicSite.update({
    where: { id: siteId },
    data: {
      ratingAverage: summary._count._all > 0 ? summary._avg.rating : null,
      ratingCount: summary._count._all,
    },
  });
}
