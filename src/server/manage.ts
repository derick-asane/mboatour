import { notFound } from "next/navigation";

import type { SitePermission } from "@/generated/prisma/enums";
import { can, type Membership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser, type SessionUser } from "@/server/session";

export type ManagedSite = {
  user: SessionUser;
  membership: Membership;
  site: NonNullable<Awaited<ReturnType<typeof findSite>>>;
};

function findSite(slug: string) {
  return prisma.touristicSite.findUnique({ where: { slug } });
}

/// Loads a site the current user administers, or 404s. Optionally requires a
/// specific permission, which renders the section inaccessible without it.
export async function loadManagedSite(
  slug: string,
  permission?: SitePermission,
): Promise<ManagedSite> {
  const user = await requireUser(`/manage/${slug}`);
  const site = await findSite(slug);

  if (!site) notFound();

  const membership = await prisma.siteMember.findUnique({
    where: { userId_siteId: { userId: user.id, siteId: site.id } },
    select: { role: true, permissions: true },
  });

  if (!membership) notFound();
  if (permission && !can(membership, permission)) notFound();

  return { user, membership, site };
}
