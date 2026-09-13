"use client";

import { useTranslations } from "next-intl";

import { SiteForm } from "@/components/site-form";
import { createSiteAction } from "@/server/actions/sites";

export function CreateSiteForm() {
  const t = useTranslations("SiteForm");

  return <SiteForm action={createSiteAction} submitLabel={t("create")} />;
}
