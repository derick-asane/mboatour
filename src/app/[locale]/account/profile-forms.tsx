"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/avatar";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/upload-limits";
import { initialActionState } from "@/server/action-state";
import {
  changePasswordAction,
  removeAvatarAction,
  updateProfileAction,
} from "@/server/actions/account";

export function ProfileForm({
  name,
  email,
  imageUrl,
}: {
  name: string | null;
  email: string;
  imageUrl: string | null;
}) {
  const t = useTranslations("Account");
  const [state, formAction] = useActionState(
    updateProfileAction,
    initialActionState,
  );
  const [picked, setPicked] = useState<File | null>(null);
  const cls = (field: string) =>
    state.fieldErrors?.[field] ? "input input-error" : "input";

  // Revoked whenever the choice changes, so a long visit does not leak them.
  const preview = useMemo(
    () => (picked ? URL.createObjectURL(picked) : null),
    [picked],
  );

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const tooLarge = picked !== null && picked.size > MAX_IMAGE_BYTES;

  return (
    <form action={formAction} className="card space-y-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* What they will look like to everyone else, before saving. */}
        <Avatar
          name={name ?? email}
          imageUrl={preview ?? imageUrl}
          className="h-20 w-20 text-2xl"
        />

        <div className="min-w-48 flex-1 space-y-2">
          <span className="label">{t("picture")}</span>

          <input
            type="file"
            name="picture"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="input"
            onChange={(event) => setPicked(event.target.files?.[0] ?? null)}
          />

          <p className="hint">{t("pictureHint")}</p>

          {tooLarge ? (
            <p className="alert alert-warning">{t("pictureTooLarge")}</p>
          ) : null}
        </div>
      </div>

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
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton>{t("saveProfile")}</SubmitButton>
          {imageUrl ? <RemovePicture /> : null}
        </div>
      </div>
    </form>
  );
}

/// Its own form, because it is a different action: nesting one inside the
/// profile form is not allowed, so it sits beside the save button instead.
function RemovePicture() {
  const t = useTranslations("Account");
  const [state, formAction] = useActionState(
    removeAvatarAction,
    initialActionState,
  );

  return (
    <>
      <button
        type="submit"
        formAction={formAction}
        className="btn-ghost btn-sm"
      >
        {t("removePicture")}
      </button>
      <FormMessage state={state} />
    </>
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
