"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isGuideLanguage, MAX_GUIDE_BIO, MAX_GUIDE_HEADLINE } from "@/lib/guides";
import { normalisePhone } from "@/lib/payments";
import { isPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { isUploadedFile, saveUploadedImage } from "@/lib/uploads";
import { failure, fieldFailure, type ActionState } from "@/server/action-state";
import {
  PermissionError,
  requirePermission,
  requireUser,
} from "@/server/session";

const profileSchema = z.object({
  headline: z.string().trim().min(10).max(MAX_GUIDE_HEADLINE),
  bio: z.string().trim().min(40).max(MAX_GUIDE_BIO),
  city: z.string().trim().max(80).optional().transform((v) => v || null),
  country: z.string().trim().max(80).optional().transform((v) => v || null),
  phone: z.string().trim().max(20).optional().transform((v) => v || null),
  whatsapp: z.string().trim().max(20).optional().transform((v) => v || null),
  yearsExperience: z
    .union([z.coerce.number().int().min(0).max(70), z.literal("")])
    .optional()
    .transform((v) => (typeof v === "number" ? v : null)),
  hourlyRate: z
    .union([z.coerce.number().min(0).max(10_000_000), z.literal("")])
    .optional()
    .transform((v) => (typeof v === "number" ? v : null)),
  dailyRate: z
    .union([z.coerce.number().min(0).max(10_000_000), z.literal("")])
    .optional()
    .transform((v) => (typeof v === "number" ? v : null)),
  currency: z.string().trim().length(3).toUpperCase().default("XAF"),
});

/// Creates or updates the signed-in account's own guide profile. Editing a
/// profile the platform already checked sends it back for review: the details
/// people were vouched for are the ones that changed.
export async function saveGuideProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    headline: formData.get("headline"),
    bio: formData.get("bio"),
    city: formData.get("city") ?? undefined,
    country: formData.get("country") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    whatsapp: formData.get("whatsapp") ?? undefined,
    yearsExperience: formData.get("yearsExperience") ?? undefined,
    hourlyRate: formData.get("hourlyRate") ?? undefined,
    dailyRate: formData.get("dailyRate") ?? undefined,
    currency: formData.get("currency") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= field;
    }
    return fieldFailure(fieldErrors);
  }

  const languages = formData
    .getAll("languages")
    .map((value) => String(value))
    .filter(isGuideLanguage);

  if (languages.length === 0) return failure("pickALanguage");

  const data = parsed.data;

  // Numbers are stored in one shape so a guide can be reached the same way
  // whoever entered them.
  const phone = data.phone ? normalisePhone(data.phone) : null;
  const whatsapp = data.whatsapp ? normalisePhone(data.whatsapp) : null;

  if (data.phone && !phone) return failure("invalidPhone");
  if (data.whatsapp && !whatsapp) return failure("invalidPhone");

  const existing = await prisma.guideProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, slug: true, photoUrl: true, status: true },
  });

  const picture = formData.get("photo");
  let photoUrl = existing?.photoUrl ?? null;

  if (isUploadedFile(picture)) {
    const saved = await saveUploadedImage(picture, "guides");

    if ("error" in saved) return failure(saved.error);

    photoUrl = saved.url;
  }

  const slug =
    existing?.slug ??
    (await uniqueSlug(user.name ?? data.headline, async (candidate) => {
      const found = await prisma.guideProfile.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return found !== null;
    }));

  const shared = {
    headline: data.headline,
    bio: data.bio,
    languages,
    city: data.city,
    country: data.country,
    phone,
    whatsapp,
    photoUrl,
    yearsExperience: data.yearsExperience,
    hourlyRateCents: data.hourlyRate === null ? null : Math.round(data.hourlyRate * 100),
    dailyRateCents: data.dailyRate === null ? null : Math.round(data.dailyRate * 100),
    currency: data.currency,
  };

  await prisma.guideProfile.upsert({
    where: { userId: user.id },
    create: { ...shared, userId: user.id, slug, status: "DRAFT" },
    update: {
      ...shared,
      // A verified profile that changes goes back in the queue; a suspended one
      // stays suspended until the platform lifts it.
      ...(existing?.status === "VERIFIED"
        ? { status: "PENDING", verifiedAt: null, verifiedById: null }
        : {}),
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/guide`);
  revalidatePath(`/${locale}/guides`);
  revalidatePath(`/${locale}/guides/${slug}`);

  return { success: existing ? "guideProfileUpdated" : "guideProfileCreated" };
}

/// Asks the platform to check the profile so it can be listed.
export async function submitGuideForReviewAction(
  // Both arguments are required by useActionState; this action needs neither,
  // since it acts on the signed-in account own profile.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _previous: ActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const profile = await prisma.guideProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  });

  if (!profile) return failure("guideProfileMissing");
  if (profile.status === "VERIFIED") return failure("alreadyVerified");
  if (profile.status === "SUSPENDED") return failure("guideSuspended");

  await prisma.guideProfile.update({
    where: { id: profile.id },
    data: { status: "PENDING", reviewNote: null },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/guide`);
  revalidatePath(`/${locale}/admin/guides`);

  return { success: "guideSubmitted" };
}

const decisionSchema = z.object({
  guideId: z.string().min(1),
  decision: z.enum(["VERIFIED", "SUSPENDED", "DRAFT"]),
  note: z.string().trim().max(500).optional().transform((v) => v || null),
});

/// The platform vouches for who a guide is, or withdraws that. Sites cannot do
/// this: a guide works across many sites, so identity belongs to the platform.
export async function decideGuideAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  if (!isPlatformAdmin(user.platformRole)) return failure("forbidden");

  const parsed = decisionSchema.safeParse({
    guideId: formData.get("guideId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) return failure("invalidInput");

  const { guideId, decision, note } = parsed.data;

  const guide = await prisma.guideProfile.findUnique({
    where: { id: guideId },
    select: { slug: true },
  });

  if (!guide) return failure("guideProfileMissing");

  await prisma.guideProfile.update({
    where: { id: guideId },
    data: {
      status: decision,
      reviewNote: note,
      verifiedAt: decision === "VERIFIED" ? new Date() : null,
      verifiedById: decision === "VERIFIED" ? user.id : null,
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/guides`);
  revalidatePath(`/${locale}/guides`);
  revalidatePath(`/${locale}/guides/${guide.slug}`);

  return { success: "guideDecided" };
}

/// A guide asks a site to vouch for them.
export async function requestEndorsementAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const siteId = String(formData.get("siteId") ?? "");

  const profile = await prisma.guideProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  });

  if (!profile) return failure("guideProfileMissing");

  const site = await prisma.touristicSite.findUnique({
    where: { id: siteId },
    select: { id: true, slug: true, published: true },
  });

  if (!site?.published) return failure("siteNotFound");

  await prisma.guideEndorsement.upsert({
    where: { guideId_siteId: { guideId: profile.id, siteId: site.id } },
    create: { guideId: profile.id, siteId: site.id, status: "PENDING" },
    update: { status: "PENDING", note: null, decidedAt: null, decidedById: null },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/guide`);
  revalidatePath(`/${locale}/manage/${site.slug}/guides`);

  return { success: "endorsementRequested" };
}

const endorsementSchema = z.object({
  endorsementId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(500).optional().transform((v) => v || null),
});

/// A site decides whether it vouches for a guide who asked.
export async function decideEndorsementAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = endorsementSchema.safeParse({
    endorsementId: formData.get("endorsementId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) return failure("invalidInput");

  const endorsement = await prisma.guideEndorsement.findUnique({
    where: { id: parsed.data.endorsementId },
    select: {
      id: true,
      siteId: true,
      site: { select: { slug: true } },
      guide: { select: { slug: true } },
    },
  });

  if (!endorsement) return failure("endorsementNotFound");

  try {
    await requirePermission(user.id, endorsement.siteId, "MANAGE_GUIDES");
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  await prisma.guideEndorsement.update({
    where: { id: endorsement.id },
    data: {
      status: parsed.data.decision,
      note: parsed.data.note,
      decidedById: user.id,
      decidedAt: new Date(),
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/manage/${endorsement.site.slug}/guides`);
  revalidatePath(`/${locale}/guides/${endorsement.guide.slug}`);

  return { success: "endorsementDecided" };
}
