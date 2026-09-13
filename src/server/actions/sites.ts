"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isSiteCategory } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { uniqueSlug } from "@/lib/slug";
import { MAX_GALLERY_IMAGES } from "@/lib/upload-limits";
import { deleteUploadedImage, readImageUploads } from "@/lib/uploads";
import {
  failure,
  fieldFailure,
  type ActionState,
} from "@/server/action-state";
import { PermissionError, requirePermission, requireUser } from "@/server/session";

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((value) => (value ? value : null));

const siteSchema = z.object({
  name: z.string().trim().min(3).max(120),
  summary: z.string().trim().max(280).optional().transform((v) => v || null),
  description: optionalText,
  category: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || isSiteCategory(v)),
  address: z.string().trim().max(200).optional().transform((v) => v || null),
  city: z.string().trim().max(80).optional().transform((v) => v || null),
  country: z.string().trim().max(80).optional().transform((v) => v || null),
  openingHours: z.string().trim().max(200).optional().transform((v) => v || null),
  // Both coordinates travel together: half a position is not a position.
  latitude: z
    .union([z.coerce.number().min(-90).max(90), z.literal("")])
    .optional()
    .transform((v) => (typeof v === "number" ? v : null)),
  longitude: z
    .union([z.coerce.number().min(-180).max(180), z.literal("")])
    .optional()
    .transform((v) => (typeof v === "number" ? v : null)),
  currency: z.string().trim().length(3).toUpperCase().default("XAF"),
  entryFee: z.coerce.number().min(0).max(100000).default(0),
  published: z.boolean().default(false),
});

function readSiteForm(formData: FormData) {
  return siteSchema.safeParse({
    name: formData.get("name"),
    summary: formData.get("summary") ?? undefined,
    description: formData.get("description") ?? undefined,
    category: formData.get("category") ?? undefined,
    address: formData.get("address") ?? undefined,
    city: formData.get("city") ?? undefined,
    country: formData.get("country") ?? undefined,
    openingHours: formData.get("openingHours") ?? undefined,
    latitude: formData.get("latitude") ?? undefined,
    longitude: formData.get("longitude") ?? undefined,
    currency: formData.get("currency") || undefined,
    entryFee: formData.get("entryFee") || 0,
    published: formData.get("published") === "on",
  });
}

function collectFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "form");
    fieldErrors[field] ??= field;
  }
  return fieldErrors;
}

/// Creating a site makes the author its OWNER, with every permission.
export async function createSiteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/sites/new");
  const parsed = readSiteForm(formData);

  if (!parsed.success) return fieldFailure(collectFieldErrors(parsed.error.issues));

  const uploads = await readImageUploads(formData, "sites");

  if ("error" in uploads) return failure(uploads.error);

  const data = parsed.data;

  const slug = await uniqueSlug(data.name, async (candidate) => {
    const found = await prisma.touristicSite.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return found !== null;
  });

  const site = await prisma.touristicSite.create({
    data: {
      name: data.name,
      slug,
      summary: data.summary,
      description: data.description,
      category: data.category,
      address: data.address,
      city: data.city,
      country: data.country,
      openingHours: data.openingHours,
      latitude: data.latitude === null || data.longitude === null ? null : data.latitude,
      longitude: data.latitude === null || data.longitude === null ? null : data.longitude,
      coverImageUrl: uploads.cover ?? null,
      currency: data.currency,
      entryFeeCents: Math.round(data.entryFee * 100),
      published: data.published,
      createdById: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
          permissions: ALL_PERMISSIONS,
        },
      },
      images: {
        create: uploads.gallery.map((url, index) => ({ url, sortOrder: index })),
      },
    },
    select: { slug: true },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/sites`);
  redirect(`/${locale}/manage/${site.slug}`);
}

export async function updateSiteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const siteId = String(formData.get("siteId") ?? "");
  const parsed = readSiteForm(formData);

  if (!parsed.success) return fieldFailure(collectFieldErrors(parsed.error.issues));

  try {
    await requirePermission(user.id, siteId, "MANAGE_SITE");
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  const existing = await prisma.touristicSite.findUnique({
    where: { id: siteId },
    select: {
      coverImageUrl: true,
      images: { select: { id: true, url: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!existing) return failure("siteNotFound");

  const removedIds = new Set(
    formData.getAll("removeImageIds").map((value) => String(value)),
  );
  const removed = existing.images.filter((image) => removedIds.has(image.id));
  const kept = existing.images.filter((image) => !removedIds.has(image.id));

  const uploads = await readImageUploads(formData, "sites");

  if ("error" in uploads) return failure(uploads.error);

  if (kept.length + uploads.gallery.length > MAX_GALLERY_IMAGES) {
    return failure("tooManyImages");
  }

  const data = parsed.data;

  const site = await prisma.touristicSite.update({
    where: { id: siteId },
    data: {
      name: data.name,
      summary: data.summary,
      description: data.description,
      category: data.category,
      address: data.address,
      city: data.city,
      country: data.country,
      openingHours: data.openingHours,
      latitude: data.latitude === null || data.longitude === null ? null : data.latitude,
      longitude: data.latitude === null || data.longitude === null ? null : data.longitude,
      // `undefined` leaves the stored cover untouched.
      coverImageUrl: uploads.cover,
      currency: data.currency,
      entryFeeCents: Math.round(data.entryFee * 100),
      published: data.published,
      images: {
        deleteMany: removed.length
          ? { id: { in: removed.map((image) => image.id) } }
          : undefined,
        create: uploads.gallery.map((url, index) => ({
          url,
          sortOrder: kept.length + index,
        })),
      },
    },
    select: { slug: true },
  });

  // Files go last: the rows they belong to are already gone.
  for (const image of removed) await deleteUploadedImage(image.url);

  if (uploads.cover !== undefined && existing.coverImageUrl) {
    await deleteUploadedImage(existing.coverImageUrl);
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/manage/${site.slug}`);
  revalidatePath(`/${locale}/sites/${site.slug}`);
  revalidatePath(`/${locale}/sites`);

  return { success: "siteUpdated" };
}
