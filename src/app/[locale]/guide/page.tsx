import { getTranslations, setRequestLocale } from "next-intl/server";

import { GuideStatusPanel } from "@/app/[locale]/guide/status-panel";
import { GuideForm } from "@/components/guides/guide-form";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

/// Where someone manages their own guide profile. The public listing lives at
/// /guides; this is the back of it.
export default async function GuideProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser("/guide");
  const t = await getTranslations("Guides");

  const profile = await prisma.guideProfile.findUnique({
    where: { userId: user.id },
    include: {
      endorsements: {
        orderBy: { createdAt: "desc" },
        include: { site: { select: { name: true, slug: true } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("yourProfileTitle")}
        description={t("yourProfileSubtitle")}
        actions={
          profile?.status === "VERIFIED" ? (
            <Link href={`/guides/${profile.slug}`} className="btn-secondary">
              {t("viewPublic")}
            </Link>
          ) : null
        }
      />

      {profile ? (
        <GuideStatusPanel
          status={profile.status}
          reviewNote={profile.reviewNote}
          endorsements={profile.endorsements.map((endorsement) => ({
            id: endorsement.id,
            siteName: endorsement.site.name,
            status: endorsement.status,
            note: endorsement.note,
          }))}
        />
      ) : null}

      <section className="space-y-4">
        <SectionHeader title={t("detailsTitle")} />
        <GuideForm
          values={
            profile
              ? {
                  headline: profile.headline,
                  bio: profile.bio,
                  languages: profile.languages,
                  city: profile.city,
                  country: profile.country,
                  phone: profile.phone,
                  whatsapp: profile.whatsapp,
                  photoUrl: profile.photoUrl,
                  yearsExperience: profile.yearsExperience,
                  hourlyRateCents: profile.hourlyRateCents,
                  dailyRateCents: profile.dailyRateCents,
                  currency: profile.currency,
                }
              : undefined
          }
        />
      </section>
    </div>
  );
}
