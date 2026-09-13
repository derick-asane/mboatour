import { getTranslations, setRequestLocale } from "next-intl/server";

import { ManageNav } from "@/components/manage-nav";
import { StatusBadge } from "@/components/status-badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/permissions";
import { loadManagedSite } from "@/server/manage";

export default async function ManageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { site, membership } = await loadManagedSite(slug);
  const t = await getTranslations("Manage");

  const tabs = [
    { key: "overview" as const, href: `/manage/${slug}`, label: t("overview") },
    ...(can(membership, "MANAGE_SITE")
      ? [{ key: "settings" as const, href: `/manage/${slug}/settings`, label: t("settings") }]
      : []),
    ...(can(membership, "MANAGE_EVENTS") || can(membership, "MANAGE_BOOKINGS")
      ? [{ key: "events" as const, href: `/manage/${slug}/events`, label: t("events") }]
      : []),
    ...(can(membership, "MANAGE_VISITS")
      ? [{ key: "visits" as const, href: `/manage/${slug}/visits`, label: t("visits") }]
      : []),
    ...(can(membership, "MANAGE_MEMBERS")
      ? [{ key: "members" as const, href: `/manage/${slug}/members`, label: t("members") }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{site.name}</h1>
            {site.verification === "VERIFIED" ? <VerifiedBadge /> : null}
            {site.published ? (
              <StatusBadge status="PUBLISHED" />
            ) : (
              <StatusBadge status="DRAFT" />
            )}
          </div>
          <p className="meta">/{site.slug}</p>
        </div>

        <Link href={`/sites/${slug}`} className="btn-secondary">
          {t("viewPublic")}
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M14 5h5v5M19 5l-7.5 7.5" />
            <path d="M18 14.5V18a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V8a1.5 1.5 0 0 1 1.5-1.5H10" />
          </svg>
        </Link>
      </div>

      <ManageNav tabs={tabs} />

      {children}
    </div>
  );
}
