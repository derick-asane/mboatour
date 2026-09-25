import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { EndorsementDecision } from "@/app/[locale]/manage/[slug]/guides/endorsement-decision";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/avatar";
import { SectionHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { isGuideLanguage } from "@/lib/guides";
import { prisma } from "@/lib/prisma";
import { loadManagedSite } from "@/server/manage";

/// Guides asking this site to vouch for them. Endorsing is a recommendation,
/// not permission: a guide works whether or not any site has endorsed them.
export default async function ManageGuidesPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { site } = await loadManagedSite(slug, "MANAGE_GUIDES");
  const t = await getTranslations("Guides");
  const languages = await getTranslations("Languages");
  const format = await getFormatter();

  const endorsements = await prisma.guideEndorsement.findMany({
    where: { siteId: site.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      guide: {
        select: {
          slug: true,
          headline: true,
          languages: true,
          photoUrl: true,
          status: true,
          city: true,
          user: { select: { name: true, email: true, image: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-5">
      <SectionHeader title={t("manageTitle")} description={t("manageHint")} />

      {endorsements.length === 0 ? (
        <EmptyState title={t("noRequests")} description={t("noRequestsHint")} />
      ) : (
        <ul className="space-y-3">
          {endorsements.map((endorsement) => {
            const who =
              endorsement.guide.user.name ?? endorsement.guide.user.email;

            return (
              <li key={endorsement.id} className="card space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar
                    name={who}
                    imageUrl={
                      endorsement.guide.photoUrl ?? endorsement.guide.user.image
                    }
                    className="h-14 w-14 shrink-0 text-base"
                  />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/guides/${endorsement.guide.slug}`}
                        className="font-medium hover:text-accent"
                      >
                        {who}
                      </Link>
                      <span
                        className={`badge ${
                          endorsement.status === "APPROVED"
                            ? "badge-success"
                            : endorsement.status === "REJECTED"
                              ? "badge-danger"
                              : "badge-warning"
                        }`}
                      >
                        {t(endorsement.status)}
                      </span>
                      {endorsement.guide.status !== "VERIFIED" ? (
                        <span className="badge" title={t("guideNotVerifiedHint")}>
                          {t("guideNotVerified")}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-muted">
                      {endorsement.guide.headline}
                    </p>

                    <p className="text-xs text-faint">
                      {endorsement.guide.city ?? ""}
                      {endorsement.guide.city ? " · " : ""}
                      {format.dateTime(endorsement.createdAt, {
                        dateStyle: "medium",
                      })}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {endorsement.guide.languages.map((code) => (
                        <span key={code} className="badge">
                          {isGuideLanguage(code) ? languages(code) : code}
                        </span>
                      ))}
                    </div>

                    {endorsement.note ? (
                      <p className="text-xs text-muted">{endorsement.note}</p>
                    ) : null}
                  </div>
                </div>

                <EndorsementDecision
                  endorsementId={endorsement.id}
                  status={endorsement.status}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
