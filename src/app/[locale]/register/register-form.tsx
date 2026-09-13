"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { registerAction } from "@/server/actions/account";

export function RegisterForm({ next }: { next?: string }) {
  const t = useTranslations("Auth");
  const [state, formAction] = useActionState(registerAction, initialActionState);
  const invalid = (field: string) =>
    state.fieldErrors?.[field] ? "input input-error" : "input";

  return (
    <form action={formAction} className="card space-y-4 sm:p-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label={t("name")}>
        <input
          className={invalid("name")}
          type="text"
          name="name"
          autoComplete="name"
          required
        />
      </Field>

      <Field label={t("email")}>
        <input
          className={invalid("email")}
          type="email"
          name="email"
          autoComplete="email"
          required
        />
      </Field>

      <Field label={t("password")} hint={t("passwordHint")}>
        <input
          className={invalid("password")}
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full">{t("signUpCta")}</SubmitButton>
    </form>
  );
}
