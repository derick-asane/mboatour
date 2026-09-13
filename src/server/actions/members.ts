"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { DEFAULT_ADMIN_PERMISSIONS, parsePermissions } from "@/lib/permissions";
import { failure, type ActionState } from "@/server/action-state";
import { PermissionError, requirePermission, requireUser } from "@/server/session";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

async function guard(userId: string, siteId: string) {
  await requirePermission(userId, siteId, "MANAGE_MEMBERS");

  const site = await prisma.touristicSite.findUnique({
    where: { id: siteId },
    select: { slug: true },
  });

  if (!site) throw new PermissionError();

  return site;
}

async function revalidateMembers(slug: string) {
  const locale = await getLocale();
  revalidatePath(`/${locale}/manage/${slug}/members`);
}

/// Grants an existing account an admin seat on the site.
export async function addMemberAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const siteId = String(formData.get("siteId") ?? "");
  const parsed = inviteSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) return failure("invalidEmail");

  const selected = parsePermissions(formData.getAll("permissions").map(String));
  const permissions = selected.length ? selected : DEFAULT_ADMIN_PERMISSIONS;

  let site;
  try {
    site = await guard(actor.id, siteId);
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  const invitee = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (!invitee) return failure("userNotFound");

  const existing = await prisma.siteMember.findUnique({
    where: { userId_siteId: { userId: invitee.id, siteId } },
    select: { id: true },
  });

  if (existing) return failure("alreadyMember");

  await prisma.siteMember.create({
    data: { userId: invitee.id, siteId, role: "ADMIN", permissions },
  });

  await revalidateMembers(site.slug);

  return { success: "memberAdded" };
}

export async function updateMemberPermissionsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const siteId = String(formData.get("siteId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const permissions = parsePermissions(
    formData.getAll("permissions").map(String),
  );

  let site;
  try {
    site = await guard(actor.id, siteId);
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  const member = await prisma.siteMember.findUnique({
    where: { id: memberId },
    select: { id: true, role: true, siteId: true },
  });

  if (!member || member.siteId !== siteId) return failure("memberNotFound");
  // The owner's permissions are implicit and cannot be trimmed away.
  if (member.role === "OWNER") return failure("cannotEditOwner");

  await prisma.siteMember.update({
    where: { id: memberId },
    data: { permissions },
  });

  await revalidateMembers(site.slug);

  return { success: "memberUpdated" };
}

export async function removeMemberAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const siteId = String(formData.get("siteId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  let site;
  try {
    site = await guard(actor.id, siteId);
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  const member = await prisma.siteMember.findUnique({
    where: { id: memberId },
    select: { id: true, role: true, siteId: true },
  });

  if (!member || member.siteId !== siteId) return failure("memberNotFound");
  if (member.role === "OWNER") return failure("cannotRemoveOwner");

  await prisma.siteMember.delete({ where: { id: memberId } });

  await revalidateMembers(site.slug);

  return { success: "memberRemoved" };
}
