import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { VerificationDecision } from "@/app/[locale]/admin/sites/verification-decision";
import { CoverImage } from "@/components/cover-image";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/server/session";

const STATUSES = ["PENDING", "UNVERIFIED", "VERIFIED", "REJECTED"] as const;

type Status = (typeof STATUSES)[number];

function isStatus(value: string | undefined): value is Status {
  return value !== undefined && (STATUSES as readonly string[]).includes(value);
}

const TONES: Record<Status, string> = {
  PENDING: "badge-warning",
  UNVERIFIED: "",
  VERIFIED: "badge-success",
  REJECTED: "badge-danger",
};

export default async function AdminSitesPage({
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
  const verification = await getTranslations("Verification");
  const categories = await getTranslations("Categories");
  const format = await getFormatter();

  const sites = await prisma.touristicSite.findMany({
    where: filter ? { verification: filter } : {},
    // Sites waiting on a decision come first.
    orderBy: [{ verification: "asc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true, email: true } },
      verifiedBy: { select: { name: true, email: true } },
      _count: { select: { events: true, members: true } },
    },
  });

  return (
    <div className="space-y-5">
      <SectionHeader title={t("sites")} description={t("sitesHint")} />

      <nav className="flex flex-wrap gap-1 rounded-xl border border-line surface-muted p-1">
        <Link href="/admin/sites" className={`tab ${filter ? "" : "tab-active"}`}>
          {t("filterAll")}
        </Link>
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={`/admin/sites?status=${value}`}
            className={`tab ${filter === value ? "tab-active" : ""}`}
          >
            {verification(value)}
          </Link>
        ))}
      </nav>

      {sites.length === 0 ? (
        <EmptyState title={t("noSites")} />
      ) : (
        <ul className="space-y-3">
          {sites.map((site) => (
            <li key={site.id} className="card space-y-4">
              <div className="flex flex-wrap items-start gap-4">
                <CoverImage
                  src={site.coverImageUrl}
                  alt=""
                  className="h-16 w-24 shrink-0 rounded-lg border border-line"
                />

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/sites/${site.slug}`}
                      className="font-medium hover:text-accent"
                    >
                      {site.name}
                    </Link>
                    <span className={`badge ${TONES[site.verification]}`}>
                      {verification(site.verification)}
                    </span>
                    {!site.published ? (
                      <span className="badge">{verification("DRAFT")}</span>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted">
                    {site.category && categories.has(site.category)
                      ? `${categories(site.category)} · `
                      : ""}
                    {[site.city, site.country].filter(Boolean).join(", ")}
                  </p>

                  <p className="text-xs text-faint">
                    {t("createdBy", {
                      name: site.createdBy.name ?? site.createdBy.email,
                    })}
                    {" · "}
                    {format.dateTime(site.createdAt, { dateStyle: "medium" })}
                    {" · "}
                    {t("countsLine", {
                      events: site._count.events,
                      admins: site._count.members,
                    })}
                  </p>

                  {site.verificationNote ? (
                    <p className="text-xs text-muted">
                      {t("note")}: {site.verificationNote}
                    </p>
                  ) : null}

                  {site.verifiedBy && site.verifiedAt ? (
                    <p className="text-xs text-faint">
                      {t("verifiedBy", {
                        name: site.verifiedBy.name ?? site.verifiedBy.email,
                        date: format.dateTime(site.verifiedAt, {
                          dateStyle: "medium",
                        }),
                      })}
                    </p>
                  ) : null}
                </div>
              </div>

              <VerificationDecision
                siteId={site.id}
                verification={site.verification}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
