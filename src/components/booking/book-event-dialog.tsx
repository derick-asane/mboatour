"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";

import { Field, FormMessage, SubmitButton } from "@/components/form";
import {
  isPlausibleCard,
  lastFourDigits,
  needsCard,
  needsPhone,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/payments";
import { initialActionState } from "@/server/action-state";
import { bookEventAction } from "@/server/actions/bookings";

const METHOD_ICONS: Record<PaymentMethod, string> = {
  MTN_MOMO: "#ffcc00",
  ORANGE_MONEY: "#ff7900",
  CARD: "#1a1f71",
};

export function BookEventDialog({
  eventId,
  eventTitle,
  maxSeats,
  priceLabel,
  isFree,
  simulatedPayments,
  defaultName,
}: {
  eventId: string;
  eventTitle: string;
  maxSeats: number;
  priceLabel: string;
  isFree: boolean;
  simulatedPayments: boolean;
  defaultName: string;
}) {
  const t = useTranslations("Booking");
  const events = useTranslations("Events");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(bookEventAction, initialActionState);
  const [method, setMethod] = useState<PaymentMethod>("MTN_MOMO");
  const [card, setCard] = useState("");

  const cardLast4 = lastFourDigits(card);
  const cardLooksValid = card === "" || isPlausibleCard(card);

  // A booking that went through has nothing left to show in a dialog.
  useEffect(() => {
    if (state.success) dialogRef.current?.close();
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        className="btn-primary btn-sm"
        onClick={() => dialogRef.current?.showModal()}
      >
        {events("book")}
      </button>

      {/* A native dialog brings focus trapping, Escape and the backdrop with
          it, which a div pretending to be a modal does not. */}
      <dialog
        ref={dialogRef}
        className="w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-foreground backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          // Clicking the backdrop, which is the dialog element itself.
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <form action={formAction} className="space-y-5 p-5 sm:p-6">
          <input type="hidden" name="eventId" value={eventId} />

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="section-title">{t("title")}</h2>
              <p className="hint">{eventTitle}</p>
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
              <Field label={t("attendeeName")}>
                <input
                  className="input"
                  name="attendeeName"
                  defaultValue={defaultName}
                  autoComplete="name"
                  required
                  minLength={2}
                />
              </Field>

              <Field label={t("attendeePhone")} hint={t("phoneHint")}>
                <input
                  className="input"
                  name="attendeePhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+237 6XX XX XX XX"
                  autoComplete="tel"
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={events("seats")}>
                <input
                  className="input"
                  type="number"
                  name="seats"
                  min={1}
                  max={Math.max(Math.min(maxSeats, 50), 1)}
                  defaultValue={1}
                  required
                />
              </Field>

              <div>
                <span className="label">{t("total")}</span>
                <p className="input flex items-center font-semibold">
                  {priceLabel}
                </p>
              </div>
            </div>

            <Field label={`${events("note")} (${t("optional")})`}>
              <input className="input" name="note" maxLength={500} />
            </Field>
          </div>

          {isFree ? null : (
            <div className="space-y-4 border-t border-line pt-4">
              <div>
                <span className="label">{t("payWith")}</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PAYMENT_METHODS.map((option) => (
                    <label
                      key={option}
                      className={`check-tile cursor-pointer items-center ${
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
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ background: METHOD_ICONS[option] }}
                        />
                        <span className="text-sm">{t(option)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {needsPhone(method) ? (
                <Field label={t("payerPhone")} hint={t("payerPhoneHint")}>
                  <input
                    className="input"
                    name="payerPhone"
                    type="tel"
                    inputMode="tel"
                    placeholder="+237 6XX XX XX XX"
                  />
                </Field>
              ) : null}

              {needsCard(method) ? (
                <div className="space-y-3">
                  {/* The number stays in the browser: only the last four digits
                      are submitted, so no card number reaches our server. */}
                  <Field label={t("cardNumber")} hint={t("cardHint")}>
                    <input
                      className={`input ${cardLooksValid ? "" : "input-error"}`}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="4242 4242 4242 4242"
                      value={card}
                      onChange={(event) => setCard(event.target.value)}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t("cardExpiry")}>
                      <input
                        className="input"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                      />
                    </Field>
                    <Field label={t("cardCvc")}>
                      <input
                        className="input"
                        autoComplete="cc-csc"
                        inputMode="numeric"
                        placeholder="123"
                      />
                    </Field>
                  </div>

                  <input type="hidden" name="cardLast4" value={cardLast4 ?? ""} />

                  {!cardLooksValid ? (
                    <p className="alert alert-error">{t("cardInvalid")}</p>
                  ) : null}
                </div>
              ) : null}

              {simulatedPayments ? (
                <p className="alert alert-warning">{t("simulatedNotice")}</p>
              ) : null}
            </div>
          )}

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
              <SubmitButton>
                {isFree ? t("confirmFree") : t("payNow", { amount: priceLabel })}
              </SubmitButton>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
