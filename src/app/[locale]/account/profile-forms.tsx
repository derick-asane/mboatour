"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import {
  changePasswordAction,
  updateProfileAction,
} from "@/server/actions/account";

export function ProfileForm({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const t = useTranslations("Account");
  const [state, formAction] = useActionState(
    updateProfileAction,
    initialActionState,
  );
  const cls = (field: string) =>
    state.fieldErrors?.[field] ? "input input-error" : "input";

  return (
    <form action={formAction} className="card space-y-5 sm:p-6">
      <Field label={t("name")}>
        <input
          className={cls("name")}
          name="name"
          defaultValue={name ?? ""}
          autoComplete="name"
          required
          minLength={2}
        />
      </Field>

      <Field label={t("email")} hint={t("emailHint")}>
        <input
          className={cls("email")}
          type="email"
          name="email"
          defaultValue={email}
          autoComplete="email"
          required
        />
      </Field>

      <div className="space-y-3">
        <FormMessage state={state} />
        <SubmitButton>{t("saveProfile")}</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations("Account");
  const [state, formAction] = useActionState(
    changePasswordAction,
    initialActionState,
  );
  const cls = (field: string) =>
    state.fieldErrors?.[field] ? "input input-error" : "input";

  return (
    <form action={formAction} className="card space-y-5 sm:p-6">
      {hasPassword ? (
        <Field label={t("currentPassword")}>
          <input
            className="input"
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            required
          />
        </Field>
      ) : (
        <p className="alert">{t("noPasswordYet")}</p>
      )}

      <Field label={t("newPassword")} hint={t("newPasswordHint")}>
        <input
          className={cls("newPassword")}
          type="password"
          name="newPassword"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <div className="space-y-3">
        <FormMessage state={state} />
        <SubmitButton>{t("savePassword")}</SubmitButton>
      </div>
    </form>
  );
}
