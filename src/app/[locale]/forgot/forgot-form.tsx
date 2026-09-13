"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { requestPasswordResetAction } from "@/server/actions/account";

export function ForgotForm() {
  const t = useTranslations("Auth");
  const [state, formAction] = useActionState(
    requestPasswordResetAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="card space-y-4 sm:p-6">
      <Field label={t("email")} hint={t("forgotHint")}>
        <input
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          required
        />
      </Field>

      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full">{t("forgotCta")}</SubmitButton>
    </form>
  );
}
