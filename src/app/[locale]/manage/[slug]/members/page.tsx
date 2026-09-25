import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  AddMemberForm,
  MemberPermissionsForm,
} from "@/app/[locale]/manage/[slug]/members/member-clients";
import { Avatar } from "@/components/avatar";
import { SectionHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { loadManagedSite } from "@/server/manage";

export default async function ManageMembersPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { site } = await loadManagedSite(slug, "MANAGE_MEMBERS");
  const t = await getTranslations("Members");

  const members = await prisma.siteMember.findMany({
    where: { siteId: site.id },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { user: { select: { name: true, email: true, image: true } } },
  });

  return (
    <div className="space-y-8">
      <SectionHeader title={t("title")} description={t("subtitle")} />

      <section className="max-w-2xl space-y-3">
        <h3 className="text-sm font-semibold tracking-tight">{t("addTitle")}</h3>
        <AddMemberForm siteId={site.id} />
      </section>

      <ul className="space-y-3">
        {members.map((member) => {
          const who = member.user.name ?? member.user.email;

          return (
            <li key={member.id} className="card space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar
                  name={who}
                  imageUrl={member.user.image}
                  title={member.user.email}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{who}</p>
                  <p className="truncate text-xs text-muted">
                    {member.user.email}
                  </p>
                </div>
                <span
                  className={`badge ${
                    member.role === "OWNER" ? "badge-accent" : ""
                  }`}
                >
                  {member.role === "OWNER" ? t("owner") : t("admin")}
                </span>
              </div>

              {member.role === "OWNER" ? (
                <p className="text-xs text-muted">{t("ownerNote")}</p>
              ) : (
                <MemberPermissionsForm
                  siteId={site.id}
                  memberId={member.id}
                  permissions={member.permissions}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
