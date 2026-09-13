import { getTranslations, setRequestLocale } from "next-intl/server";

import { RequestVerification } from "@/app/[locale]/manage/[slug]/request-verification";
import { CoverImage } from "@/components/cover-image";
import { SectionHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { ALL_PERMISSIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { loadManagedSite } from "@/server/manage";

export default async function ManageOverviewPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { site, membership } = await loadManagedSite(slug);
  const t = await getTranslations("Manage");
  const permissionsT = await getTranslations("Permissions");
  const verification = await getTranslations("Verification");

  const [events, members, pendingVisits, pendingBookings] = await Promise.all([
    prisma.event.count({ where: { siteId: site.id } }),
    prisma.siteMember.count({ where: { siteId: site.id } }),
    prisma.visitRequest.count({ where: { siteId: site.id, status: "PENDING" } }),
    prisma.booking.count({
      where: { status: "PENDING", event: { siteId: site.id } },
    }),
  ]);

  // Pending counts link to the queue that clears them.
  const stats = [
    {
      label: t("statsEvents"),
      value: events,
      href: can(membership, "MANAGE_EVENTS") ? `/manage/${slug}/events` : null,
      alert: false,
    },
    {
      label: t("statsMembers"),
      value: members,
      href: can(membership, "MANAGE_MEMBERS") ? `/manage/${slug}/members` : null,
      alert: false,
    },
    {
      label: t("statsPendingVisits"),
      value: pendingVisits,
      href: can(membership, "MANAGE_VISITS") ? `/manage/${slug}/visits` : null,
      alert: pendingVisits > 0,
    },
    {
      label: t("statsPendingBookings"),
      value: pendingBookings,
      href: can(membership, "MANAGE_BOOKINGS") ? `/manage/${slug}/events` : null,
      alert: pendingBookings > 0,
    },
  ];


  const VERIFICATION_TONES: Record<string, string> = {
    PENDING: "badge-warning",
    UNVERIFIED: "",
    VERIFIED: "badge-success",
    REJECTED: "badge-danger",
  };

  const held = ALL_PERMISSIONS.filter((permission) => can(membership, permission));

  return (
    <div className="space-y-8">
      <section className="panel overflow-hidden">
        <CoverImage
          src={site.coverImageUrl}
          alt=""
          className="h-44 w-full sm:h-60"
        />
        {!site.coverImageUrl && can(membership, "MANAGE_SITE") ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
            <p className="meta">{t("noCover")}</p>
            <Link
              href={`/manage/${slug}/settings`}
              className="btn-secondary btn-sm"
            >
              {t("addCover")}
            </Link>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="section-title text-base">{verification("title")}</h2>
            <p className="hint">{verification(`${site.verification}Hint`)}</p>
          </div>
          <span className={`badge ${VERIFICATION_TONES[site.verification] ?? ""}`}>
            {verification(site.verification)}
          </span>
        </div>

        {site.verificationNote ? (
          <p className="alert">{site.verificationNote}</p>
        ) : null}

        {can(membership, "MANAGE_SITE") &&
        site.verification !== "VERIFIED" &&
        site.verification !== "PENDING" ? (
          <RequestVerification siteId={site.id} />
        ) : null}
      </section>

      <section className="space-y-3">
        <SectionHeader title={t("yourPermissions")} />
        <ul className="flex flex-wrap gap-2">
          {held.map((permission) => (
            <li key={permission} className="badge badge-accent">
              {permissionsT(permission)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
