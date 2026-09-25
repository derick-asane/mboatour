import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { GuideDecision } from "@/app/[locale]/admin/guides/guide-decision";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { isGuideLanguage } from "@/lib/guides";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/server/session";

const STATUSES = ["PENDING", "VERIFIED", "DRAFT", "SUSPENDED"] as const;

type Status = (typeof STATUSES)[number];

const TONES: Record<Status, string> = {
  PENDING: "badge-warning",
  VERIFIED: "badge-success",
  DRAFT: "",
  SUSPENDED: "badge-danger",
};

function isStatus(value: string | undefined): value is Status {
  return value !== undefined && (STATUSES as readonly string[]).includes(value);
}

export default async function AdminGuidesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePlatformAdmin();

  const { status } = await searchParams;
  const filter = isStatus(status) ? status : null;

  const t = await getTranslations("Admin");
  const guidesT = await getTranslations("Guides");
  const languages = await getTranslations("Languages");
  const format = await getFormatter();

  const guides = await prisma.guideProfile.findMany({
    where: filter ? { status: filter } : {},
    // Anything waiting on a decision first.
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      user: { select: { name: true, email: true, image: true } },
      // Only the ones a site actually granted: a request still waiting, or one
      // that was turned down, is not an endorsement and must not be counted as
      // one on a public card.
      _count: { select: { endorsements: { where: { status: "APPROVED" } } } },
    },
  });

  return (
    <div className="space-y-5">
      <SectionHeader title={guidesT("adminTitle")} description={guidesT("adminHint")} />

      <nav className="flex flex-wrap gap-1 rounded-xl border border-line surface-muted p-1">
        <Link href="/admin/guides" className={`tab ${filter ? "" : "tab-active"}`}>
          {t("filterAll")}
        </Link>
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={`/admin/guides?status=${value}`}
            className={`tab ${filter === value ? "tab-active" : ""}`}
          >
            {guidesT(value)}
          </Link>
        ))}
      </nav>

      {guides.length === 0 ? (
        <EmptyState title={guidesT("noGuidesQueue")} />
      ) : (
        <ul className="space-y-3">
          {guides.map((guide) => (
            <li key={guide.id} className="card space-y-4">
              <div className="flex flex-wrap items-start gap-3">
                <Avatar
                  name={guide.user.name ?? guide.user.email}
                  imageUrl={guide.photoUrl ?? guide.user.image}
                  className="h-14 w-14 shrink-0 text-base"
                />

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/guides/${guide.slug}`}
                      className="font-medium hover:text-accent"
                    >
                      {guide.user.name ?? guide.user.email}
                    </Link>
                    <span className={`badge ${TONES[guide.status as Status] ?? ""}`}>
                      {guidesT(guide.status)}
                    </span>
                  </div>

                  <p className="text-sm text-muted">{guide.headline}</p>

                  <p className="text-xs text-faint">
                    {guide.user.email}
                    {" · "}
                    {[guide.city, guide.country].filter(Boolean).join(", ")}
                    {" · "}
                    {guidesT("endorsedBy", { count: guide._count.endorsements })}
                    {" · "}
                    {format.dateTime(guide.updatedAt, { dateStyle: "medium" })}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {guide.languages.map((code) => (
                      <span key={code} className="badge">
                        {isGuideLanguage(code) ? languages(code) : code}
                      </span>
                    ))}
                  </div>

                  {guide.reviewNote ? (
                    <p className="text-xs text-muted">
                      {t("note")}: {guide.reviewNote}
                    </p>
                  ) : null}
                </div>
              </div>

              <GuideDecision guideId={guide.id} status={guide.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
