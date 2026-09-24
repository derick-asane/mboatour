"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { MAX_RATING, MAX_REVIEW_LENGTH, MIN_RATING } from "@/lib/reviews";
import { failure, type ActionState } from "@/server/action-state";
import { canReviewGuide, refreshGuideRating } from "@/server/guide-reviews";
import { requireUser } from "@/server/session";

const reviewSchema = z.object({
  guideId: z.string().min(1),
  rating: z.coerce.number().int().min(MIN_RATING).max(MAX_RATING),
  body: z
    .string()
    .trim()
    .max(MAX_REVIEW_LENGTH)
    .optional()
    .transform((value) => (value ? value : null)),
});

/// Leaves or replaces the traveller's own rating of a guide.
export async function submitGuideReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = reviewSchema.safeParse({
    guideId: formData.get("guideId"),
    rating: formData.get("rating"),
    body: formData.get("body") ?? undefined,
  });

  if (!parsed.success) return failure("invalidRating");

  const { guideId, rating, body } = parsed.data;

  const guide = await prisma.guideProfile.findUnique({
    where: { id: guideId },
    select: { id: true, userId: true, slug: true },
  });

  if (!guide) return failure("guideProfileMissing");

  const eligibility = await canReviewGuide(user.id, guide);

  if (!eligibility.allowed) return failure("guideNotBeenYet");

  const existing = await prisma.guideReview.findUnique({
    where: { guideId_userId: { guideId, userId: user.id } },
    select: { id: true },
  });

  await prisma.guideReview.upsert({
    where: { guideId_userId: { guideId, userId: user.id } },
    create: { guideId, userId: user.id, rating, body },
    update: { rating, body, editedAt: new Date() },
  });

  await refreshGuideRating(guideId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/guides/${guide.slug}`);
  revalidatePath(`/${locale}/guides`);

  return { success: existing ? "reviewUpdated" : "reviewPosted" };
}

export async function deleteOwnGuideReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const reviewId = String(formData.get("reviewId") ?? "");

  const review = await prisma.guideReview.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, guideId: true, guide: { select: { slug: true } } },
  });

  if (!review || review.userId !== user.id) return failure("reviewNotFound");

  await prisma.guideReview.delete({ where: { id: review.id } });
  await refreshGuideRating(review.guideId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/guides/${review.guide.slug}`);
  revalidatePath(`/${locale}/guides`);

  return { success: "reviewDeleted" };
}

const replySchema = z.object({
  reviewId: z.string().min(1),
  reply: z.string().trim().max(MAX_REVIEW_LENGTH),
});

/// The guide answers a review of their own work. They may reply to anything and
/// remove nothing.
export async function replyToGuideReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = replySchema.safeParse({
    reviewId: formData.get("reviewId"),
    reply: formData.get("reply"),
  });

  if (!parsed.success) return failure("invalidInput");

  const review = await prisma.guideReview.findUnique({
    where: { id: parsed.data.reviewId },
    select: {
      id: true,
      guide: { select: { userId: true, slug: true } },
    },
  });

  if (!review) return failure("reviewNotFound");
  if (review.guide.userId !== user.id) return failure("forbidden");

  const reply = parsed.data.reply || null;

  await prisma.guideReview.update({
    where: { id: review.id },
    data: { reply, repliedAt: reply ? new Date() : null },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/guides/${review.guide.slug}`);

  return { success: reply ? "replyPosted" : "replyRemoved" };
}

/// Hides or restores a review. Platform admins only, as for sites: this is the
/// remedy for abuse, not for a bad score.
export async function hideGuideReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  if (!isPlatformAdmin(user.platformRole)) return failure("forbidden");

  const reviewId = String(formData.get("reviewId") ?? "");

  const review = await prisma.guideReview.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      guideId: true,
      hiddenAt: true,
      guide: { select: { slug: true } },
    },
  });

  if (!review) return failure("reviewNotFound");

  const hiding = review.hiddenAt === null;

  await prisma.guideReview.update({
    where: { id: review.id },
    data: {
      hiddenAt: hiding ? new Date() : null,
      hiddenById: hiding ? user.id : null,
    },
  });

  await refreshGuideRating(review.guideId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/guides/${review.guide.slug}`);
  revalidatePath(`/${locale}/guides`);

  return { success: hiding ? "reviewHidden" : "reviewRestored" };
}
