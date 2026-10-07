import { getTranslations, setRequestLocale } from "next-intl/server";

import { AskClient } from "@/app/[locale]/ask/ask-client";
import { PageHeader } from "@/components/page-header";
import { isAssistantConfigured } from "@/server/ai/mistral";
import { requireUser } from "@/server/session";

/// Ask a question, get an answer, and get taken to the places that answer it.
export default async function AskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Each question costs a call to a paid model, so it is for people who have
  // signed in.
  await requireUser("/ask");

  const t = await getTranslations("Assistant");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {isAssistantConfigured() ? (
        <AskClient
          examples={[t("example1"), t("example2"), t("example3")]}
        />
      ) : (
        /* Better to say the key is missing than to let every question fail. */
        <p className="alert alert-warning">{t("notConfigured")}</p>
      )}
    </div>
  );
}
