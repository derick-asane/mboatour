import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ServiceCard } from "@/components/service-card";
import { Link } from "@/i18n/navigation";
import { isServiceKind, SERVICE_KINDS } from "@/lib/places";
import { prisma } from "@/lib/prisma";
import { publicServiceWhere } from "@/lib/sites";
import { getCurrentUser } from "@/server/session";

/// Somewhere to sleep, somewhere to eat, a way to get around. Only what the
/// platform has verified is listed, the same rule the sites tab follows.
export default async function ServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { kind, q } = await searchParams;
  const filter = isServiceKind(kind) ? kind : null;
  const query = q?.trim();

  const t = await getTranslations("Services");
  const kinds = await getTranslations("PlaceKinds");
  const common = await getTranslations("Common");
  const user = await getCurrentUser();

  const services = await prisma.touristicSite.findMany({
    where: {
      ...publicServiceWhere(),
      ...(filter ? { kind: filter } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { city: { contains: query, mode: "insensitive" as const } },
              { country: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ ratingCount: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      kind: true,
      name: true,
      summary: true,
      city: true,
      country: true,
      coverImageUrl: true,
      verification: true,
      entryFeeCents: true,
      currency: true,
      ratingAverage: true,
      ratingCount: true,
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          user ? (
            <Link href="/services/new" className="btn-primary">
              {t("create")}
            </Link>
          ) : null
        }
      />

      <form className="flex flex-wrap gap-2" action="" role="search">
        {filter ? <input type="hidden" name="kind" value={filter} /> : null}
        <input
          className="input max-w-sm flex-1"
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
        <button type="submit" className="btn-secondary">
          {common("search")}
        </button>
      </form>

      <nav className="flex flex-wrap gap-1 rounded-xl border border-line surface-muted p-1">
        <Link href="/services" className={`tab ${filter ? "" : "tab-active"}`}>
          {t("allKinds")}
        </Link>
        {SERVICE_KINDS.map((value) => (
          <Link
            key={value}
            href={`/services?kind=${value}`}
            className={`tab ${filter === value ? "tab-active" : ""}`}
          >
            {kinds(value)}
          </Link>
        ))}
      </nav>

      {services.length === 0 ? (
        <EmptyState
          title={t("empty")}
          description={t("emptyHint")}
          action={
            user ? (
              <Link href="/services/new" className="btn-primary btn-sm">
                {t("create")}
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
