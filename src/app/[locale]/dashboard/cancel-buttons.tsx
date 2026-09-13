"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { cancelOwnBookingAction } from "@/server/actions/bookings";
import { cancelVisitRequestAction } from "@/server/actions/visits";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const t = useTranslations("Dashboard");
  const [state, formAction] = useActionState(
    cancelOwnBookingAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <SubmitButton className="btn-danger btn-sm">{t("cancelBooking")}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CancelVisitButton({ requestId }: { requestId: string }) {
  const t = useTranslations("Dashboard");
  const [state, formAction] = useActionState(
    cancelVisitRequestAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton className="btn-danger btn-sm">{t("cancelVisit")}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
