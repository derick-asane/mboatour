"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import { toDateInput } from "@/lib/format";
import { initialActionState } from "@/server/action-state";
import { requestVisitAction } from "@/server/actions/visits";

export function VisitRequestForm({ siteId }: { siteId: string }) {
  const t = useTranslations("Site");
  const [state, formAction] = useActionState(
    requestVisitAction,
    initialActionState,
  );
  const today = toDateInput(new Date());

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="siteId" value={siteId} />

      <Field label={t("visitDate")}>
        <input
          className="input"
          type="date"
          name="visitDate"
          min={today}
          defaultValue={today}
          required
        />
      </Field>

      <Field label={t("partySize")}>
        <input
          className="input"
          type="number"
          name="partySize"
          min={1}
          max={200}
          defaultValue={1}
        />
      </Field>

      <Field label={t("message")}>
        <textarea className="input" name="message" rows={3} maxLength={1000} />
      </Field>

      <FormMessage state={state} />
      <SubmitButton>{t("requestCta")}</SubmitButton>
    </form>
  );
}
