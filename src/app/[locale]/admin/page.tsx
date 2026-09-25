import { getTranslations, setRequestLocale } from "next-intl/server";

import { SectionHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/server/session";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePlatformAdmin();

  const t = await getTranslations("Admin");

  const [pending, verified, totalSites, published, admins, users, complaints] =
    await Promise.all([
      prisma.touristicSite.count({ where: { verification: "PENDING" } }),
      prisma.touristicSite.count({ where: { verification: "VERIFIED" } }),
      prisma.touristicSite.count(),
      prisma.touristicSite.count({ where: { published: true } }),
      prisma.user.count({ where: { platformRole: { not: "MEMBER" } } }),
      prisma.user.count(),
      // Anything nobody has closed yet, which is what someone arriving here
      // needs to see first.
      prisma.guideComplaint.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    ]);

  const stats = [
    { label: t("statsPending"), value: pending, href: "/admin/sites?status=PENDING", alert: pending > 0 },
    { label: t("statsComplaints"), value: complaints, href: "/admin/complaints", alert: complaints > 0 },
    { label: t("statsVerified"), value: verified, href: "/admin/sites?status=VERIFIED", alert: false },
    { label: t("statsSites"), value: totalSites, href: "/admin/sites", alert: false },
    { label: t("statsPublished"), value: published, href: "/admin/sites", alert: false },
    { label: t("statsAdmins"), value: admins, href: "/admin/admins", alert: false },
    { label: t("statsUsers"), value: users, href: null, alert: false },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title={t("overview")} description={t("overviewHint")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const body = (
            <>
              <p
                className={`text-3xl font-semibold tracking-tight ${
                  stat.alert ? "text-warning" : ""
                }`}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
                {stat.label}
              </p>
            </>
          );

          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className="card card-interactive block"
            >
              {body}
            </Link>
          ) : (
            <div key={stat.label} className="card">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
