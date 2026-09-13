"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { failure, type ActionState } from "@/server/action-state";
import {
  sendVisitDecisionEmail,
  sendVisitRequestedEmails,
} from "@/server/email/notify";
import { PermissionError, requirePermission, requireUser } from "@/server/session";

const visitSchema = z.object({
  siteId: z.string().min(1),
  visitDate: z.coerce.date(),
  partySize: z.coerce.number().int().min(1).max(200),
  message: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => value || null),
});

/// Any signed-in user can ask to visit a published site.
export async function requestVisitAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = visitSchema.safeParse({
    siteId: formData.get("siteId"),
    visitDate: formData.get("visitDate"),
    partySize: formData.get("partySize") || 1,
    message: formData.get("message") ?? undefined,
  });

  if (!parsed.success) return failure("invalidInput");

  const { siteId, visitDate, partySize, message } = parsed.data;

  const site = await prisma.touristicSite.findUnique({
    where: { id: siteId },
    select: { id: true, slug: true, name: true, published: true },
  });

  if (!site?.published) return failure("siteNotFound");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (visitDate < startOfToday) return failure("visitDatePast");

  const duplicate = await prisma.visitRequest.findFirst({
    where: { siteId, userId: user.id, status: "PENDING" },
    select: { id: true },
  });

  if (duplicate) return failure("visitAlreadyPending");

  await prisma.visitRequest.create({
    data: { siteId, userId: user.id, visitDate, partySize, message },
  });

  await sendVisitRequestedEmails(
    {
      siteName: site.name,
      siteSlug: site.slug,
      visitDate: visitDate.toISOString().slice(0, 10),
      partySize,
      visitorName: user.name ?? user.email,
    },
    site.id,
  );

  const locale = await getLocale();
  revalidatePath(`/${locale}/sites/${site.slug}`);
  revalidatePath(`/${locale}/dashboard`);

  return { success: "visitRequested" };
}

export async function cancelVisitRequestAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");

  const request = await prisma.visitRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true },
  });

  if (!request || request.userId !== user.id) return failure("visitNotFound");

  await prisma.visitRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard`);

  return { success: "visitCancelled" };
}

/// Site admins with MANAGE_VISITS approve or reject a pending request.
export async function decideVisitRequestAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const responseNote = String(formData.get("responseNote") ?? "").trim() || null;

  if (!["APPROVED", "REJECTED"].includes(decision)) return failure("invalidInput");

  const request = await prisma.visitRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      siteId: true,
      visitDate: true,
      partySize: true,
      user: { select: { email: true, locale: true, name: true } },
      site: { select: { slug: true, name: true } },
    },
  });

  if (!request) return failure("visitNotFound");

  try {
    await requirePermission(user.id, request.siteId, "MANAGE_VISITS");
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  await prisma.visitRequest.update({
    where: { id: requestId },
    data: {
      status: decision as "APPROVED" | "REJECTED",
      responseNote,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  await sendVisitDecisionEmail(
    request.user,
    {
      siteName: request.site.name,
      siteSlug: request.site.slug,
      visitDate: request.visitDate.toISOString().slice(0, 10),
      partySize: request.partySize,
      visitorName: request.user.name ?? request.user.email,
    },
    decision as "APPROVED" | "REJECTED",
    responseNote,
  );

  const locale = await getLocale();
  revalidatePath(`/${locale}/manage/${request.site.slug}/visits`);

  return { success: "visitUpdated" };
}
