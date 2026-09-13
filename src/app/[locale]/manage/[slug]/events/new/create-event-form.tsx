"use client";

import { useTranslations } from "next-intl";

import { EventForm } from "@/components/event-form";
import { createEventAction } from "@/server/actions/events";

export function CreateEventForm({
  siteId,
  currency,
}: {
  siteId: string;
  currency: string;
}) {
  const t = useTranslations("EventForm");

  return (
    <EventForm
      action={createEventAction}
      submitLabel={t("create")}
      siteId={siteId}
      values={{
        title: "",
        description: null,
        location: null,
        coverImageUrl: null,
        images: [],
        startsAt: new Date(),
        endsAt: null,
        capacity: null,
        priceCents: 0,
        currency,
        status: "DRAFT",
      }}
    />
  );
}
