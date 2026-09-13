"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import type { SitePermission } from "@/generated/prisma/enums";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { initialActionState } from "@/server/action-state";
import {
  addMemberAction,
  removeMemberAction,
  updateMemberPermissionsAction,
} from "@/server/actions/members";

function PermissionCheckboxes({
  selected,
  idPrefix,
}: {
  selected: SitePermission[];
  idPrefix: string;
}) {
  const t = useTranslations("Permissions");

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ALL_PERMISSIONS.map((permission) => (
        <label
          key={permission}
          htmlFor={`${idPrefix}-${permission}`}
          className="check-tile"
        >
          <input
            id={`${idPrefix}-${permission}`}
            type="checkbox"
            name="permissions"
            value={permission}
            defaultChecked={selected.includes(permission)}
            className="mt-0.5"
          />
          <span>{t(permission)}</span>
        </label>
      ))}
    </div>
  );
}

export function AddMemberForm({ siteId }: { siteId: string }) {
  const t = useTranslations("Members");
  const [state, formAction] = useActionState(addMemberAction, initialActionState);

  return (
    <form action={formAction} className="card space-y-5 sm:p-6">
      <input type="hidden" name="siteId" value={siteId} />

      <Field label={t("emailLabel")} hint={t("emailHint")}>
        <input className="input" type="email" name="email" required />
      </Field>

      <div>
        <span className="label">{t("permissions")}</span>
        <PermissionCheckboxes selected={[]} idPrefix="new-member" />
      </div>

      <div className="space-y-3">
        <FormMessage state={state} />
        <SubmitButton>{t("add")}</SubmitButton>
      </div>
    </form>
  );
}

export function MemberPermissionsForm({
  siteId,
  memberId,
  permissions,
}: {
  siteId: string;
  memberId: string;
  permissions: SitePermission[];
}) {
  const t = useTranslations("Members");
  const [saveState, saveAction] = useActionState(
    updateMemberPermissionsAction,
    initialActionState,
  );
  const [removeState, removeAction] = useActionState(
    removeMemberAction,
    initialActionState,
  );

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="siteId" value={siteId} />
        <input type="hidden" name="memberId" value={memberId} />

        <span className="label">{t("permissions")}</span>
        <PermissionCheckboxes selected={permissions} idPrefix={memberId} />

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton className="btn-primary btn-sm">{t("save")}</SubmitButton>
          <FormMessage state={saveState} />
        </div>
      </form>

      <form
        action={removeAction}
        className="flex flex-wrap items-center gap-3 border-t border-line pt-3"
      >
        <input type="hidden" name="siteId" value={siteId} />
        <input type="hidden" name="memberId" value={memberId} />
        <SubmitButton className="btn-danger btn-sm">{t("remove")}</SubmitButton>
        <FormMessage state={removeState} />
      </form>
    </div>
  );
}
