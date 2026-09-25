import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { isPlatformAdmin, canManageAdmins } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { can, canAny, type Membership } from "@/lib/permissions";
import type { PlatformRole, SitePermission } from "@/generated/prisma/enums";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  /// The account picture, when one has been uploaded or came from a provider.
  image: string | null;
  platformRole: PlatformRole;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;

  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      platformRole: true,
    },
  });

  return user;
}

/// Sends anonymous visitors to the localised sign-in page, keeping `next`.
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (user) return user;

  const locale = await getLocale();
  const target = nextPath
    ? `/${locale}/login?next=${encodeURIComponent(nextPath)}`
    : `/${locale}/login`;

  redirect(target);
}

export async function getMembership(
  userId: string,
  siteId: string,
): Promise<Membership | null> {
  const member = await prisma.siteMember.findUnique({
    where: { userId_siteId: { userId, siteId } },
    select: { role: true, permissions: true },
  });

  return member;
}

export class PermissionError extends Error {
  constructor() {
    super("FORBIDDEN");
    this.name = "PermissionError";
  }
}

/// Throws unless the user holds `permission` on the site. Owners always pass.
export async function requirePermission(
  userId: string,
  siteId: string,
  permission: SitePermission,
): Promise<Membership> {
  const membership = await getMembership(userId, siteId);

  if (!can(membership, permission)) throw new PermissionError();

  return membership as Membership;
}

export async function requireAnyPermission(
  userId: string,
  siteId: string,
  permissions: SitePermission[],
): Promise<Membership> {
  const membership = await getMembership(userId, siteId);

  if (!canAny(membership, permissions)) throw new PermissionError();

  return membership as Membership;
}

/// Gate for the admin portal. Anyone without platform authority is shown a 404
/// rather than a locked door, so the portal does not advertise itself.
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user || !isPlatformAdmin(user.platformRole)) notFound();

  return user;
}

/// Stricter gate for changing who the admins are.
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user || !canManageAdmins(user.platformRole)) notFound();

  return user;
}
