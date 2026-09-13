import { getTranslations, setRequestLocale } from "next-intl/server";

import { CreateSiteForm } from "@/app/[locale]/sites/new/create-site-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/server/session";

export default async function NewSitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Anyone signed in may open a site; doing so makes them its owner.
  await requireUser("/sites/new");

  const t = await getTranslations("Sites");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("createTitle")} description={t("createSubtitle")} />
      <CreateSiteForm />
    </div>
  );
}
