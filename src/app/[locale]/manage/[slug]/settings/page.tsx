import { getTranslations, setRequestLocale } from "next-intl/server";

import { EditSiteForm } from "@/app/[locale]/manage/[slug]/settings/edit-site-form";
import { SectionHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { loadManagedSite } from "@/server/manage";

export default async function SiteSettingsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { site } = await loadManagedSite(slug, "MANAGE_SITE");
  const t = await getTranslations("Manage");

  const images = await prisma.siteImage.findMany({
    where: { siteId: site.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, url: true },
  });

  return (
    <div className="max-w-2xl space-y-5">
      <SectionHeader title={t("settings")} />
      <EditSiteForm
        values={{
          id: site.id,
          name: site.name,
          summary: site.summary,
          description: site.description,
          category: site.category,
          address: site.address,
          city: site.city,
          country: site.country,
          openingHours: site.openingHours,
          latitude: site.latitude,
          longitude: site.longitude,
          coverImageUrl: site.coverImageUrl,
          images,
          currency: site.currency,
          entryFeeCents: site.entryFeeCents,
          published: site.published,
        }}
      />
    </div>
  );
}
