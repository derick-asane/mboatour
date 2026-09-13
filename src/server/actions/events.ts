"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { MAX_GALLERY_IMAGES } from "@/lib/upload-limits";
import { deleteUploadedImage, readImageUploads } from "@/lib/uploads";
import {
  failure,
  fieldFailure,
  type ActionState,
} from "@/server/action-state";
import { PermissionError, requirePermission, requireUser } from "@/server/session";

const eventSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    description: z
      .string()
      .trim()
      .max(4000)
      .optional()
      .transform((value) => value || null),
    location: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => value || null),
    startsAt: z.coerce.date(),
    endsAt: z
      .union([z.coerce.date(), z.literal("")])
      .optional()
      .transform((value) => (value instanceof Date ? value : null)),
    capacity: z
      .union([z.coerce.number().int().min(1).max(1000000), z.literal("")])
      .optional()
      .transform((value) => (typeof value === "number" ? value : null)),
    price: z.coerce.number().min(0).max(1000000).default(0),
    currency: z.string().trim().length(3).toUpperCase().default("XAF"),
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).default("DRAFT"),
  })
  .refine((value) => !value.endsAt || value.endsAt >= value.startsAt, {
    path: ["endsAt"],
    message: "endsAt must be after startsAt",
  });

function readEventForm(formData: FormData) {
  return eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    location: formData.get("location") ?? undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") ?? undefined,
    capacity: formData.get("capacity") ?? undefined,
    price: formData.get("price") || 0,
    currency: formData.get("currency") || undefined,
    status: formData.get("status") || undefined,
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

export async function createEventAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const siteId = String(formData.get("siteId") ?? "");
  const parsed = readEventForm(formData);

  if (!parsed.success) return fieldFailure(collectFieldErrors(parsed.error.issues));

  try {
    await requirePermission(user.id, siteId, "MANAGE_EVENTS");
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  const site = await prisma.touristicSite.findUnique({
    where: { id: siteId },
    select: { slug: true },
  });

  if (!site) return failure("siteNotFound");

  const uploads = await readImageUploads(formData, "events");

  if ("error" in uploads) return failure(uploads.error);

  const data = parsed.data;

  const slug = await uniqueSlug(data.title, async (candidate) => {
    const found = await prisma.event.findUnique({
      where: { siteId_slug: { siteId, slug: candidate } },
      select: { id: true },
    });
    return found !== null;
  });

  await prisma.event.create({
    data: {
      siteId,
      slug,
      title: data.title,
      description: data.description,
      location: data.location,
      coverImageUrl: uploads.cover ?? null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      capacity: data.capacity,
      priceCents: Math.round(data.price * 100),
      currency: data.currency,
      status: data.status,
      createdById: user.id,
      images: {
        create: uploads.gallery.map((url, index) => ({ url, sortOrder: index })),
      },
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/manage/${site.slug}/events`);
  revalidatePath(`/${locale}/sites/${site.slug}`);
  redirect(`/${locale}/manage/${site.slug}/events`);
}

export async function updateEventAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const eventId = String(formData.get("eventId") ?? "");
  const parsed = readEventForm(formData);

  if (!parsed.success) return fieldFailure(collectFieldErrors(parsed.error.issues));

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      siteId: true,
      coverImageUrl: true,
      site: { select: { slug: true } },
      images: { select: { id: true, url: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!event) return failure("eventNotFound");

  try {
    await requirePermission(user.id, event.siteId, "MANAGE_EVENTS");
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  const removedIds = new Set(
    formData.getAll("removeImageIds").map((value) => String(value)),
  );
  const removed = event.images.filter((image) => removedIds.has(image.id));
  const kept = event.images.filter((image) => !removedIds.has(image.id));

  const uploads = await readImageUploads(formData, "events");

  if ("error" in uploads) return failure(uploads.error);

  if (kept.length + uploads.gallery.length > MAX_GALLERY_IMAGES) {
    return failure("tooManyImages");
  }

  const data = parsed.data;

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title: data.title,
      description: data.description,
      location: data.location,
      // `undefined` leaves the stored cover untouched.
      coverImageUrl: uploads.cover,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      capacity: data.capacity,
      priceCents: Math.round(data.price * 100),
      currency: data.currency,
      status: data.status,
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
  });

  // Files go last: the rows they belong to are already gone.
  for (const image of removed) await deleteUploadedImage(image.url);

  if (uploads.cover !== undefined && event.coverImageUrl) {
    await deleteUploadedImage(event.coverImageUrl);
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/manage/${event.site.slug}/events`);
  revalidatePath(`/${locale}/sites/${event.site.slug}`);

  return { success: "eventUpdated" };
}

export async function deleteEventAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const eventId = String(formData.get("eventId") ?? "");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      siteId: true,
      coverImageUrl: true,
      site: { select: { slug: true } },
      images: { select: { url: true } },
    },
  });

  if (!event) return failure("eventNotFound");

  try {
    await requirePermission(user.id, event.siteId, "MANAGE_EVENTS");
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  // Cascade clears the image rows; their files have to go too.
  await prisma.event.delete({ where: { id: eventId } });

  for (const image of event.images) await deleteUploadedImage(image.url);
  if (event.coverImageUrl) await deleteUploadedImage(event.coverImageUrl);

  const locale = await getLocale();
  revalidatePath(`/${locale}/manage/${event.site.slug}/events`);
  redirect(`/${locale}/manage/${event.site.slug}/events`);
}
