import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  AddAdminForm,
  AdminRoleForm,
} from "@/app/[locale]/admin/admins/admin-clients";
import { Avatar } from "@/components/avatar";
import { SectionHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/server/session";

export default async function AdminAdminsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Only super admins may see or change who holds authority.
  const current = await requireSuperAdmin();
  const t = await getTranslations("Admin");

  const admins = await prisma.user.findMany({
    where: { platformRole: { not: "MEMBER" } },
    orderBy: [{ platformRole: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      platformRole: true,
    },
  });

  return (
    <div className="space-y-8">
      <SectionHeader title={t("admins")} description={t("adminsHint")} />

      <section className="max-w-2xl space-y-3">
        <h3 className="text-sm font-semibold tracking-tight">{t("addTitle")}</h3>
        <AddAdminForm />
      </section>

      <ul className="space-y-3">
        {admins.map((admin) => {
          const who = admin.name ?? admin.email;

          return (
            <li key={admin.id} className="card space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={who} imageUrl={admin.image} title={admin.email} />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{who}</p>
                  <p className="truncate text-xs text-muted">{admin.email}</p>
                </div>

                <span
                  className={`badge ${
                    admin.platformRole === "SUPER_ADMIN" ? "badge-accent" : ""
                  }`}
                >
                  {t(admin.platformRole)}
                </span>
              </div>

              {admin.id === current.id ? (
                <p className="text-xs text-muted">{t("selfNote")}</p>
              ) : (
                <AdminRoleForm email={admin.email} role={admin.platformRole} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
