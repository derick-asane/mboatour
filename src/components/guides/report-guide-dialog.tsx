"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import {
  COMPLAINT_REASONS,
  MAX_COMPLAINT_LENGTH,
  MIN_COMPLAINT_LENGTH,
} from "@/lib/complaints";
import { initialActionState } from "@/server/action-state";
import { fileComplaintAction } from "@/server/actions/complaints";

/// Reporting a guide to the platform team. Deliberately plain and a little
/// out of the way: it is not a rating, and it should not be the button somebody
/// presses because the weather was poor.
export function ReportGuideDialog({
  guideId,
  guideName,
  bookingId,
}: {
  guideId: string;
  guideName: string;
  /// The outing this is about, when it is opened from one.
  bookingId?: string;
}) {
  const t = useTranslations("Complaints");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(
    fileComplaintAction,
    initialActionState,
  );

  // Once it is filed there is nothing left to fill in.
  useEffect(() => {
    if (state.success) dialogRef.current?.close();
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => dialogRef.current?.showModal()}
      >
        {t("report")}
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
          {bookingId ? (
            <input type="hidden" name="bookingId" value={bookingId} />
          ) : null}

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
            <p className="text-sm text-muted">{t("intro")}</p>

            <Field label={t("reason")}>
              <select className="input" name="reason" defaultValue="CONDUCT" required>
                {COMPLAINT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {t(`reason${reason}`)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("details")} hint={t("detailsHint")}>
              <textarea
                className="input min-h-32"
                name="body"
                minLength={MIN_COMPLAINT_LENGTH}
                maxLength={MAX_COMPLAINT_LENGTH}
                required
              />
            </Field>

            <p className="hint">{t("privacyNote")}</p>
          </div>

          <FormMessage state={state} />

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dialogRef.current?.close()}
            >
              {t("cancel")}
            </button>
            <SubmitButton>{t("submit")}</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
