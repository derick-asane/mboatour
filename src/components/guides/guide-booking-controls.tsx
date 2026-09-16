"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import { needsCard, needsPhone, PAYMENT_METHODS, type PaymentMethod } from "@/lib/payments";
import { initialActionState } from "@/server/action-state";
import {
  cancelGuideBookingAction,
  payGuideBookingAction,
  respondToGuideBookingAction,
} from "@/server/actions/guide-bookings";

/// The guide accepts or declines, with a note either way.
export function RespondToRequest({ bookingId }: { bookingId: string }) {
  const t = useTranslations("GuideBooking");
  const [state, formAction] = useActionState(
    respondToGuideBookingAction,
    initialActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-line surface-muted p-3"
    >
      <input type="hidden" name="bookingId" value={bookingId} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1">
          <span className="label">{t("note")}</span>
          <input className="input" name="note" maxLength={500} />
        </label>

        <button type="submit" name="decision" value="ACCEPTED" className="btn-primary">
          {t("accept")}
        </button>
        <button type="submit" name="decision" value="DECLINED" className="btn-danger">
          {t("decline")}
        </button>
      </div>

      <FormMessage state={state} />
    </form>
  );
}

/// The traveller pays the guide once they have accepted.
export function PayGuide({
  bookingId,
  amountLabel,
}: {
  bookingId: string;
  amountLabel: string;
}) {
  const t = useTranslations("GuideBooking");
  const booking = useTranslations("Booking");
  const [state, formAction] = useActionState(
    payGuideBookingAction,
    initialActionState,
  );
  const [method, setMethod] = useState<PaymentMethod>("MTN_MOMO");

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-line surface-muted p-3"
    >
      <input type="hidden" name="bookingId" value={bookingId} />

      <div>
        <span className="label">{booking("payWith")}</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {PAYMENT_METHODS.map((option) => (
            <label
              key={option}
              className={`check-tile items-center ${
                method === option ? "border-accent-border bg-accent-soft" : ""
              }`}
            >
              <input
                type="radio"
                name="method"
                value={option}
                checked={method === option}
                onChange={() => setMethod(option)}
              />
              <span className="text-sm">{booking(option)}</span>
            </label>
          ))}
        </div>
      </div>

      {needsPhone(method) ? (
        <Field label={booking("payerPhone")}>
          <input
            className="input"
            name="payerPhone"
            type="tel"
            placeholder="+237 6XX XX XX XX"
            required
          />
        </Field>
      ) : null}

      {needsCard(method) ? (
        <Field label={booking("cardNumber")}>
          <input
            className="input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="4242 4242 4242 4242"
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "");
              const hidden = event.currentTarget.form?.elements.namedItem(
                "cardLast4",
              ) as HTMLInputElement | null;
              if (hidden) hidden.value = digits.slice(-4);
            }}
          />
        </Field>
      ) : null}

      <input type="hidden" name="cardLast4" defaultValue="" />

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>{t("payNow", { amount: amountLabel })}</SubmitButton>
        <span className="text-xs text-faint">{t("paidDirectShort")}</span>
      </div>

      <FormMessage state={state} />
    </form>
  );
}

export function CancelGuideBooking({ bookingId }: { bookingId: string }) {
  const t = useTranslations("GuideBooking");
  const [state, formAction] = useActionState(
    cancelGuideBookingAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <SubmitButton className="btn-danger btn-sm">{t("cancelBooking")}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
