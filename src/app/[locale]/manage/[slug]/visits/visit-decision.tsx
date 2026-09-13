"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormMessage } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { decideVisitRequestAction } from "@/server/actions/visits";

export function VisitDecision({ requestId }: { requestId: string }) {
  const t = useTranslations("Visits");
  const [state, formAction] = useActionState(
    decideVisitRequestAction,
    initialActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-line surface-muted p-3"
    >
      <input type="hidden" name="requestId" value={requestId} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1">
          <span className="label">{t("responseNote")}</span>
          <input className="input" name="responseNote" maxLength={500} />
        </label>

        <button
          type="submit"
          name="decision"
          value="APPROVED"
          className="btn-primary"
        >
          {t("approve")}
        </button>
        <button
          type="submit"
          name="decision"
          value="REJECTED"
          className="btn-danger"
        >
          {t("reject")}
        </button>
      </div>

      <FormMessage state={state} />
    </form>
  );
}
