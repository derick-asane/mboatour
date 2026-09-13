import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SiteCard } from "@/components/site-card";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

export default async function SitesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { q } = await searchParams;
  const t = await getTranslations("Sites");
  const common = await getTranslations("Common");

  const query = q?.trim();

  const sites = await prisma.touristicSite.findMany({
    where: {
      published: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { city: { contains: query, mode: "insensitive" as const } },
              { country: { contains: query, mode: "insensitive" as const } },
              { category: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          events: { where: { status: "PUBLISHED", startsAt: { gte: new Date() } } },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link href="/sites/new" className="btn-secondary">
            {t("createTitle")}
          </Link>
        }
      />

      <form className="flex flex-wrap gap-2 rounded-xl border border-line surface-muted p-2">
        <div className="relative min-w-56 flex-1">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            className="input pl-9"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <button type="submit" className="btn-primary">
          {common("search")}
        </button>
      </form>

      {sites.length === 0 ? (
        <EmptyState
          title={t("empty")}
          action={
            <Link href="/sites" className="btn-secondary btn-sm">
              {t("title")}
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="meta">{t("resultCount", { count: sites.length })}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                upcomingEvents={site._count.events}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
