"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormMessage } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { decideEndorsementAction } from "@/server/actions/guides";

export function EndorsementDecision({
  endorsementId,
  status,
}: {
  endorsementId: string;
  status: string;
}) {
  const t = useTranslations("Guides");
  const admin = useTranslations("Admin");
  const [state, formAction] = useActionState(
    decideEndorsementAction,
    initialActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-line surface-muted p-3"
    >
      <input type="hidden" name="endorsementId" value={endorsementId} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1">
          <span className="label">{admin("note")}</span>
          <input className="input" name="note" maxLength={500} />
        </label>

        {status !== "APPROVED" ? (
          <button type="submit" name="decision" value="APPROVED" className="btn-primary">
            {t("endorse")}
          </button>
        ) : null}

        {status !== "REJECTED" ? (
          <button type="submit" name="decision" value="REJECTED" className="btn-danger">
            {t("declineEndorsement")}
          </button>
        ) : null}
      </div>

      <FormMessage state={state} />
    </form>
  );
}
