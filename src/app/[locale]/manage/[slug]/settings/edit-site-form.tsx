"use client";

import { useTranslations } from "next-intl";

import { SiteForm, type SiteFormValues } from "@/components/site-form";
import { updateSiteAction } from "@/server/actions/sites";

export function EditSiteForm({ values }: { values: SiteFormValues }) {
  const t = useTranslations("SiteForm");

  return (
    <SiteForm action={updateSiteAction} submitLabel={t("save")} values={values} />
  );
}
