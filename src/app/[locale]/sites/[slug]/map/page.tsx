import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SiteMapScreen } from "@/components/map/site-map-screen";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/server/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Map" });

  const site = await prisma.touristicSite.findUnique({
    where: { slug },
    select: { name: true },
  });

  return { title: site ? `${site.name} — ${t("title")}` : t("title") };
}

export default async function SiteMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ route?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { route } = await searchParams;

  const site = await prisma.touristicSite.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      published: true,
    },
  });

  if (!site) notFound();

  // Nothing to show without a position, and drafts stay with their team.
  if (site.latitude === null || site.longitude === null) notFound();

  if (!site.published) {
    const user = await getCurrentUser();
    const membership = user ? await getMembership(user.id, site.id) : null;

    if (!membership) notFound();
  }

  const address =
    [site.address, site.city, site.country].filter(Boolean).join(", ") || null;

  return (
    <SiteMapScreen
      slug={site.slug}
      name={site.name}
      address={address}
      latitude={site.latitude}
      longitude={site.longitude}
      autoRoute={route === "1"}
    />
  );
}
