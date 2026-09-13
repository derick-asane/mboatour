"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { PlatformRole } from "@/generated/prisma/enums";
import { canManageAdmins } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { failure, type ActionState } from "@/server/action-state";
import { sendVerificationDecisionEmail } from "@/server/email/notify";
import {
  PermissionError,
  requirePermission,
  requirePlatformAdmin,
  requireSuperAdmin,
  requireUser,
} from "@/server/session";

const decisionSchema = z.object({
  siteId: z.string().min(1),
  decision: z.enum(["VERIFIED", "REJECTED", "UNVERIFIED"]),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
});

/// Verifies, rejects or resets a site. The badge is the platform vouching for
/// the site, so only platform admins may touch it.
export async function decideSiteVerificationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requirePlatformAdmin();

  const parsed = decisionSchema.safeParse({
    siteId: formData.get("siteId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) return failure("invalidInput");

  const { siteId, decision, note } = parsed.data;

  const site = await prisma.touristicSite.findUnique({
    where: { id: siteId },
    select: {
      slug: true,
      name: true,
      createdBy: { select: { email: true, locale: true } },
    },
  });

  if (!site) return failure("siteNotFound");

  await prisma.touristicSite.update({
    where: { id: siteId },
    data: {
      verification: decision,
      verificationNote: note,
      verifiedAt: decision === "VERIFIED" ? new Date() : null,
      verifiedById: decision === "VERIFIED" ? admin.id : null,
    },
  });

  await sendVerificationDecisionEmail(
    site.createdBy,
    site.name,
    site.slug,
    decision,
    note,
  );

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/sites`);
  revalidatePath(`/${locale}/sites/${site.slug}`);
  revalidatePath(`/${locale}/sites`);
  revalidatePath(`/${locale}/manage/${site.slug}`);

  return { success: "verificationUpdated" };
}

/// A site team asks the platform to look at their site.
export async function requestVerificationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const siteId = String(formData.get("siteId") ?? "");

  const user = await requireUser();

  try {
    await requirePermission(user.id, siteId, "MANAGE_SITE");
  } catch (error) {
    if (error instanceof PermissionError) return failure("forbidden");
    throw error;
  }

  const site = await prisma.touristicSite.findUnique({
    where: { id: siteId },
    select: { slug: true, verification: true },
  });

  if (!site) return failure("siteNotFound");

  // An already verified site has nothing to ask for.
  if (site.verification === "VERIFIED") return failure("alreadyVerified");

  await prisma.touristicSite.update({
    where: { id: siteId },
    data: { verification: "PENDING", verificationNote: null },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/manage/${site.slug}`);
  revalidatePath(`/${locale}/admin/sites`);

  return { success: "verificationRequested" };
}

const roleSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["MEMBER", "ADMIN", "SUPER_ADMIN"]),
});

/// Grants or revokes platform authority by email address.
export async function setPlatformRoleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireSuperAdmin();

  const parsed = roleSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) return failure("invalidEmail");

  const { email, role } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true, platformRole: true },
  });

  if (!target) return failure("userNotFound");

  // Losing your own super admin seat could leave the platform unmanaged.
  if (target.id === admin.id && !canManageAdmins(role as PlatformRole)) {
    return failure("cannotDemoteSelf");
  }

  await prisma.user.update({ where: { id: target.id }, data: { platformRole: role } });

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/admins`);

  return { success: "adminUpdated" };
}
