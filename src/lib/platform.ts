import type { PlatformRole } from "@/generated/prisma/enums";

/// Platform authority is separate from site membership: a platform admin holds
/// no seat on any site, and a site owner holds no authority over the platform.

export function isPlatformAdmin(role: PlatformRole | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/// Only super admins change who the admins are, so one admin cannot quietly
/// remove the others.
export function canManageAdmins(role: PlatformRole | undefined): boolean {
  return role === "SUPER_ADMIN";
}

export const ASSIGNABLE_PLATFORM_ROLES: PlatformRole[] = [
  "MEMBER",
  "ADMIN",
  "SUPER_ADMIN",
];
