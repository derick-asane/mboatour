"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormMessage } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { decideGuideAction } from "@/server/actions/guides";

export function GuideDecision({
  guideId,
  status,
}: {
  guideId: string;
  status: string;
}) {
  const t = useTranslations("Admin");
  const guides = useTranslations("Guides");
  const [state, formAction] = useActionState(decideGuideAction, initialActionState);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-line surface-muted p-3"
    >
      <input type="hidden" name="guideId" value={guideId} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1">
          <span className="label">{t("note")}</span>
          <input className="input" name="note" maxLength={500} />
        </label>

        {status !== "VERIFIED" ? (
          <button type="submit" name="decision" value="VERIFIED" className="btn-primary">
            {guides("verify")}
          </button>
        ) : null}

        {status !== "SUSPENDED" ? (
          <button type="submit" name="decision" value="SUSPENDED" className="btn-danger">
            {guides("suspend")}
          </button>
        ) : (
          <button type="submit" name="decision" value="DRAFT" className="btn-secondary">
            {guides("lift")}
          </button>
        )}
      </div>

      <FormMessage state={state} />
    </form>
  );
}
