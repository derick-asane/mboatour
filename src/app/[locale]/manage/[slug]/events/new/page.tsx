import { getTranslations, setRequestLocale } from "next-intl/server";

import { CreateEventForm } from "@/app/[locale]/manage/[slug]/events/new/create-event-form";
import { SectionHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { loadManagedSite } from "@/server/manage";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { site } = await loadManagedSite(slug, "MANAGE_EVENTS");
  const t = await getTranslations("EventForm");
  const common = await getTranslations("Common");

  return (
    <div className="max-w-2xl space-y-5">
      <SectionHeader
        title={t("createTitle")}
        actions={
          <Link href={`/manage/${slug}/events`} className="btn-ghost btn-sm">
            {common("back")}
          </Link>
        }
      />
      <CreateEventForm siteId={site.id} currency={site.currency} />
    </div>
  );
}
