"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { EventForm, type EventFormValues } from "@/components/event-form";
import { FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { decideBookingAction } from "@/server/actions/bookings";
import { deleteEventAction, updateEventAction } from "@/server/actions/events";

export function EditEventForm({ values }: { values: EventFormValues }) {
  const t = useTranslations("EventForm");

  return (
    <EventForm action={updateEventAction} submitLabel={t("save")} values={values} />
  );
}

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const t = useTranslations("EventForm");
  const [state, formAction] = useActionState(deleteEventAction, initialActionState);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      <SubmitButton className="btn-danger">{t("delete")}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

/// Confirm, cancel or reopen a single booking.
export function BookingDecision({
  bookingId,
  status,
}: {
  bookingId: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
}) {
  const t = useTranslations("Bookings");
  const [state, formAction] = useActionState(
    decideBookingAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />

      {status !== "CONFIRMED" ? (
        <button
          type="submit"
          name="decision"
          value="CONFIRMED"
          className="btn-secondary btn-sm"
        >
          {t("confirm")}
        </button>
      ) : null}

      {status !== "CANCELLED" ? (
        <button
          type="submit"
          name="decision"
          value="CANCELLED"
          className="btn-danger btn-sm"
        >
          {t("reject")}
        </button>
      ) : (
        <button
          type="submit"
          name="decision"
          value="PENDING"
          className="btn-secondary btn-sm"
        >
          {t("reopen")}
        </button>
      )}

      <FormMessage state={state} />
    </form>
  );
}
