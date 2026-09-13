"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { loginAction } from "@/server/actions/account";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("Auth");
  const [state, formAction] = useActionState(loginAction, initialActionState);

  return (
    <form action={formAction} className="card space-y-4 sm:p-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label={t("email")}>
        <input
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          required
        />
      </Field>

      <Field label={t("password")}>
        <input
          className="input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full">{t("signInCta")}</SubmitButton>
    </form>
  );
}
