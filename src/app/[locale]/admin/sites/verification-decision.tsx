"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormMessage } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { decideSiteVerificationAction } from "@/server/actions/admin";

/// Verify, reject, or clear a site's badge. The note is shown to the site team.
export function VerificationDecision({
  siteId,
  verification,
}: {
  siteId: string;
  verification: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
}) {
  const t = useTranslations("Admin");
  const [state, formAction] = useActionState(
    decideSiteVerificationAction,
    initialActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-line surface-muted p-3"
    >
      <input type="hidden" name="siteId" value={siteId} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1">
          <span className="label">{t("note")}</span>
          <input className="input" name="note" maxLength={500} />
        </label>

        {verification !== "VERIFIED" ? (
          <button
            type="submit"
            name="decision"
            value="VERIFIED"
            className="btn-primary"
          >
            {t("verify")}
          </button>
        ) : null}

        {verification !== "REJECTED" ? (
          <button
            type="submit"
            name="decision"
            value="REJECTED"
            className="btn-danger"
          >
            {t("reject")}
          </button>
        ) : null}

        {verification === "VERIFIED" || verification === "REJECTED" ? (
          <button
            type="submit"
            name="decision"
            value="UNVERIFIED"
            className="btn-secondary"
          >
            {t("resetVerification")}
          </button>
        ) : null}
      </div>

      <FormMessage state={state} />
    </form>
  );
}
