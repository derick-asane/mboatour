import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  PasswordForm,
  ProfileForm,
} from "@/app/[locale]/account/profile-forms";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { isPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser("/account");
  const t = await getTranslations("Account");
  const admin = await getTranslations("Admin");

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, passwordHash: true },
  });

  if (!record) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          isPlatformAdmin(user.platformRole) ? (
            <Link href="/admin" className="btn-secondary">
              {admin("title")}
            </Link>
          ) : null
        }
      />

      {isPlatformAdmin(user.platformRole) ? (
        <p className="alert alert-success">
          {t("platformRoleNotice", { role: admin(user.platformRole) })}
        </p>
      ) : null}

      <section className="space-y-4">
        <SectionHeader title={t("profileSection")} />
        <ProfileForm name={record.name} email={record.email} />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title={t("passwordSection")}
          description={t("passwordSectionHint")}
        />
        <PasswordForm hasPassword={record.passwordHash !== null} />
      </section>
    </div>
  );
}
