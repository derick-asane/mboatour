"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { setPlatformRoleAction } from "@/server/actions/admin";

/// Grants platform authority to an existing account, found by email.
export function AddAdminForm() {
  const t = useTranslations("Admin");
  const [state, formAction] = useActionState(
    setPlatformRoleAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="card space-y-5 sm:p-6">
      <Field label={t("emailLabel")} hint={t("emailHint")}>
        <input className="input" type="email" name="email" required />
      </Field>

      <Field label={t("role")}>
        <select className="input" name="role" defaultValue="ADMIN">
          <option value="ADMIN">{t("ADMIN")}</option>
          <option value="SUPER_ADMIN">{t("SUPER_ADMIN")}</option>
        </select>
      </Field>

      <div className="space-y-3">
        <FormMessage state={state} />
        <SubmitButton>{t("addAdmin")}</SubmitButton>
      </div>
    </form>
  );
}

/// Changes or revokes one admin's authority.
export function AdminRoleForm({
  email,
  role,
}: {
  email: string;
  role: "MEMBER" | "ADMIN" | "SUPER_ADMIN";
}) {
  const t = useTranslations("Admin");
  const [state, formAction] = useActionState(
    setPlatformRoleAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="email" value={email} />

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input w-auto py-1 text-xs"
          name="role"
          defaultValue={role}
        >
          <option value="MEMBER">{t("MEMBER")}</option>
          <option value="ADMIN">{t("ADMIN")}</option>
          <option value="SUPER_ADMIN">{t("SUPER_ADMIN")}</option>
        </select>
        <SubmitButton className="btn-secondary btn-sm">{t("save")}</SubmitButton>
      </div>

      <FormMessage state={state} />
    </form>
  );
}
