import { getTranslations, setRequestLocale } from "next-intl/server";

import { ManageNav } from "@/components/manage-nav";
import { canManageAdmins } from "@/lib/platform";
import { requirePlatformAdmin } from "@/server/session";

/// The admin portal. `requirePlatformAdmin` 404s anyone without authority, so
/// the section is invisible to ordinary accounts.
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const admin = await requirePlatformAdmin();
  const t = await getTranslations("Admin");

  const tabs = [
    { key: "overview" as const, href: "/admin", label: t("overview") },
    { key: "sites" as const, href: "/admin/sites", label: t("sites") },
    { key: "guides" as const, href: "/admin/guides", label: t("guides") },
    ...(canManageAdmins(admin.platformRole)
      ? [{ key: "admins" as const, href: "/admin/admins", label: t("admins") }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="page-title">{t("title")}</h1>
        <p className="meta">
          {admin.email} · {t(admin.platformRole)}
        </p>
      </div>

      <ManageNav tabs={tabs} />

      {children}
    </div>
  );
}
