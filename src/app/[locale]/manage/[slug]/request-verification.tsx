"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { requestVerificationAction } from "@/server/actions/admin";

/// Asks the platform team to review this site for its badge.
export function RequestVerification({ siteId }: { siteId: string }) {
  const t = useTranslations("Verification");
  const [state, formAction] = useActionState(
    requestVerificationAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="siteId" value={siteId} />
      <SubmitButton className="btn-primary btn-sm">{t("request")}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
