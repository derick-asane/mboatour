"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { bookEventAction } from "@/server/actions/bookings";

export function BookEventForm({
  eventId,
  maxSeats,
}: {
  eventId: string;
  maxSeats: number;
}) {
  const t = useTranslations("Events");
  const [state, formAction] = useActionState(bookEventAction, initialActionState);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-line surface-muted p-3"
    >
      <input type="hidden" name="eventId" value={eventId} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="w-24">
          <span className="label">{t("seats")}</span>
          <input
            className="input"
            type="number"
            name="seats"
            min={1}
            max={Math.max(Math.min(maxSeats, 50), 1)}
            defaultValue={1}
          />
        </label>

        <label className="min-w-48 flex-1">
          <span className="label">{t("note")}</span>
          <input className="input" name="note" maxLength={500} />
        </label>

        <SubmitButton>{t("bookCta")}</SubmitButton>
      </div>

      <FormMessage state={state} />
    </form>
  );
}
