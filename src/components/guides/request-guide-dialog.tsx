"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import { toAmountInput } from "@/lib/currencies";
import { initialActionState } from "@/server/action-state";
import { requestGuideAction } from "@/server/actions/guide-bookings";

export function RequestGuideDialog({
  guideId,
  guideName,
  currency,
  suggestedAmountCents,
  sites,
}: {
  guideId: string;
  guideName: string;
  currency: string;
  /// The guide's daily rate, offered as a starting figure rather than a price:
  /// what they are paid is agreed between the two of them.
  suggestedAmountCents: number | null;
  sites: { id: string; name: string }[];
}) {
  const t = useTranslations("GuideBooking");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(requestGuideAction, initialActionState);

  useEffect(() => {
    if (state.success) dialogRef.current?.close();
  }, [state.success]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <button
        type="button"
        className="btn-primary"
        onClick={() => dialogRef.current?.showModal()}
      >
        {t("requestCta")}
      </button>

      <dialog
        ref={dialogRef}
        className="w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-foreground backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <form action={formAction} className="space-y-5 p-5 sm:p-6">
          <input type="hidden" name="guideId" value={guideId} />

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="section-title">{t("title")}</h2>
              <p className="hint">{guideName}</p>
            </div>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => dialogRef.current?.close()}
              aria-label={t("close")}
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 border-t border-line pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("startDate")}>
                <input
                  className="input"
                  type="date"
                  name="startDate"
                  min={today}
                  defaultValue={today}
                  required
                />
              </Field>

              <Field label={t("endDate")} hint={t("endDateHint")}>
                <input className="input" type="date" name="endDate" min={today} />
              </Field>

              <Field label={t("partySize")}>
                <input
                  className="input"
                  type="number"
                  name="partySize"
                  min={1}
                  max={200}
                  defaultValue={1}
                  required
                />
              </Field>

              <Field label={t("amount", { currency })} hint={t("amountHint")}>
                <input
                  className="input"
                  type="number"
                  name="amount"
                  min="0"
                  step="1"
                  defaultValue={
                    suggestedAmountCents === null
                      ? ""
                      : toAmountInput(suggestedAmountCents, currency)
                  }
                />
              </Field>
            </div>

            {sites.length > 0 ? (
              <div>
                <span className="label">{t("whichSites")}</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sites.map((site) => (
                    <label key={site.id} className="check-tile items-center">
                      <input type="checkbox" name="siteIds" value={site.id} />
                      <span className="truncate">{site.name}</span>
                    </label>
                  ))}
                </div>
                <p className="hint">{t("whichSitesHint")}</p>
              </div>
            ) : null}

            <Field label={t("message")}>
              <textarea className="input" name="message" rows={3} maxLength={1000} />
            </Field>
          </div>

          <p className="alert">{t("paidDirectNotice")}</p>

          <div className="space-y-3 border-t border-line pt-4">
            <FormMessage state={state} />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => dialogRef.current?.close()}
              >
                {t("cancel")}
              </button>
              <SubmitButton>{t("send")}</SubmitButton>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
