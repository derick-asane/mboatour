"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/platform";
import { failure, type ActionState } from "@/server/action-state";
import {
  canReviewSite,
  MAX_RATING,
  MIN_RATING,
  refreshSiteRating,
} from "@/server/reviews";
import {
  PermissionError,
  requirePermission,
  requireUser,
} from "@/server/session";

const reviewSchema = z.object({
  siteId: z.string().min(1),
  rating: z.coerce.number().int().min(MIN_RATING).max(MAX_RATING),
  body: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value ? value : null)),
});

/// Leaves or replaces the reviewer's own rating. One per person per site, so a
/// second submission edits the first rather than stacking.
export async function submitReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = reviewSchema.safeParse({
    siteId: formData.get("siteId"),
    rating: formData.get("rating"),
    body: formData.get("body") ?? undefined,
  });

  if (!parsed.success) return failure("invalidRating");

  const { siteId, rating, body } = parsed.data;

  const eligibility = await canReviewSite(user.id, siteId);

  if (!eligibility.allowed) return failure("notBeenYet");

  const site = await prisma.touristicSite.findUnique({
    where: { id: siteId },
    select: { slug: true },
  });

  if (!site) return failure("siteNotFound");

  const existing = await prisma.review.findUnique({
    where: { siteId_userId: { siteId, userId: user.id } },
    select: { id: true },
  });

  await prisma.review.upsert({
    where: { siteId_userId: { siteId, userId: user.id } },
    create: { siteId, userId: user.id, rating, body },
    update: { rating, body, editedAt: new Date() },
  });

  await refreshSiteRating(siteId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/sites/${site.slug}`);
  revalidatePath(`/${locale}/sites`);
  revalidatePath(`/${locale}/manage/${site.slug}/reviews`);

  return { success: existing ? "reviewUpdated" : "reviewPosted" };
}

/// Takes back one's own review entirely.
export async function deleteOwnReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const reviewId = String(formData.get("reviewId") ?? "");

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, siteId: true, site: { select: { slug: true } } },
  });

  if (!review || review.userId !== user.id) return failure("reviewNotFound");

  await prisma.review.delete({ where: { id: review.id } });
  await refreshSiteRating(review.siteId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/sites/${review.site.slug}`);
  revalidatePath(`/${locale}/sites`);

  return { success: "reviewDeleted" };
}

const replySchema = z.object({
  reviewId: z.string().min(1),
  reply: z.string().trim().max(2000),
});

/// The site team answers a review. They may reply to anything and remove
/// nothing: a site that could delete its bad reviews would make all of them
/// worthless.
export async function replyToReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = replySchema.safeParse({
    reviewId: formData.get("reviewId"),
    reply: formData.get("reply"),
  });

  if (!parsed.success) return failure("invalidInput");

  const review = await prisma.review.findUnique({
    where: { id: parsed.data.reviewId },
    select: { id: true, siteId: true, site: { select: { slug: true } } },
  });

  if (!review) return failure("reviewNotFound");

  try {
    await requirePermission(user.id, review.siteId, "MANAGE_SITE");
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  const reply = parsed.data.reply || null;

  await prisma.review.update({
    where: { id: review.id },
    data: {
      reply,
      repliedAt: reply ? new Date() : null,
      repliedById: reply ? user.id : null,
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/sites/${review.site.slug}`);
  revalidatePath(`/${locale}/manage/${review.site.slug}/reviews`);

  return { success: reply ? "replyPosted" : "replyRemoved" };
}

/// Hides or restores a review. Only platform admins, deliberately: this is the
/// remedy for abuse, not for a bad score.
export async function hideReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  if (!isPlatformAdmin(user.platformRole)) return failure("forbidden");

  const reviewId = String(formData.get("reviewId") ?? "");

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, siteId: true, hiddenAt: true, site: { select: { slug: true } } },
  });

  if (!review) return failure("reviewNotFound");

  const hiding = review.hiddenAt === null;

  await prisma.review.update({
    where: { id: review.id },
    data: {
      hiddenAt: hiding ? new Date() : null,
      hiddenById: hiding ? user.id : null,
    },
  });

  await refreshSiteRating(review.siteId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/sites/${review.site.slug}`);
  revalidatePath(`/${locale}/sites`);

  return { success: hiding ? "reviewHidden" : "reviewRestored" };
}
