import { SitePermission, SiteRole } from "@/generated/prisma/enums";

export const ALL_PERMISSIONS: SitePermission[] = [
  "MANAGE_SITE",
  "MANAGE_EVENTS",
  "MANAGE_MEMBERS",
  "MANAGE_BOOKINGS",
  "MANAGE_VISITS",
];

/// Permissions a newly invited admin gets when none are picked explicitly.
export const DEFAULT_ADMIN_PERMISSIONS: SitePermission[] = [
  "MANAGE_EVENTS",
  "MANAGE_BOOKINGS",
];

export type Membership = {
  role: SiteRole;
  permissions: SitePermission[];
};

/// Owners implicitly hold every permission, whatever their stored list says.
export function can(
  membership: Membership | null | undefined,
  permission: SitePermission,
): boolean {
  if (!membership) return false;
  if (membership.role === "OWNER") return true;
  return membership.permissions.includes(permission);
}

export function canAny(
  membership: Membership | null | undefined,
  permissions: SitePermission[],
): boolean {
  return permissions.some((permission) => can(membership, permission));
}

export function isPermission(value: string): value is SitePermission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

export function parsePermissions(values: string[]): SitePermission[] {
  return values.filter(isPermission);
}
