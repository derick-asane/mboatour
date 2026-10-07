"use client";

import { useTranslations } from "next-intl";

import { SiteForm } from "@/components/site-form";
import { SERVICE_KINDS } from "@/lib/places";
import { createSiteAction } from "@/server/actions/sites";

/// The same form a touristic site uses, with the choice of what this is. A
/// service wants everything a site wants — photos, a position, hours, a team,
/// a verification badge — so it would be a second form for no reason.
export function CreateServiceForm() {
  const t = useTranslations("SiteForm");

  return (
    <SiteForm
      action={createSiteAction}
      submitLabel={t("createService")}
      kinds={SERVICE_KINDS}
    />
  );
}
