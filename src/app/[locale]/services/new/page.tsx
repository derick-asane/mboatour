import { getTranslations, setRequestLocale } from "next-intl/server";

import { CreateServiceForm } from "@/app/[locale]/services/new/create-service-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/server/session";

export default async function NewServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Anyone signed in may list a service; doing so makes them its owner. It
  // reaches travellers only once the platform has verified it.
  await requireUser("/services/new");

  const t = await getTranslations("Services");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("createTitle")} description={t("createSubtitle")} />
      <CreateServiceForm />
    </div>
  );
}
