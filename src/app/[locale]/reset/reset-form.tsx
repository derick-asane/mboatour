"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import { Link } from "@/i18n/navigation";
import { initialActionState } from "@/server/action-state";
import { resetPasswordAction } from "@/server/actions/account";

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("Auth");
  const [state, formAction] = useActionState(
    resetPasswordAction,
    initialActionState,
  );
  const cls = state.fieldErrors?.password ? "input input-error" : "input";

  // Once the password is set the form has nothing left to do, so it gives way
  // to the way back in.
  if (state.success) {
    return (
      <div className="card space-y-4 sm:p-6">
        <FormMessage state={state} />
        <Link href="/login" className="btn-primary w-full">
          {t("signInCta")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-4 sm:p-6">
      <input type="hidden" name="token" value={token} />

      <Field label={t("newPassword")} hint={t("passwordHint")}>
        <input
          className={cls}
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full">{t("resetCta")}</SubmitButton>
    </form>
  );
}
