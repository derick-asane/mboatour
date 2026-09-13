"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
} from "@/components/form";
import { CoverImageField, GalleryField } from "@/components/image-upload";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  hasSubunits,
  toAmountInput,
} from "@/lib/currencies";
import { toDateTimeLocal } from "@/lib/format";
import { initialActionState, type ActionState } from "@/server/action-state";

export type EventFormValues = {
  id?: string;
  title: string;
  description: string | null;
  location: string | null;
  coverImageUrl: string | null;
  images: { id: string; url: string }[];
  startsAt: Date;
  endsAt: Date | null;
  capacity: number | null;
  priceCents: number;
  currency: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
};

type EventFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  siteId?: string;
  values?: EventFormValues;
};

const STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED"] as const;

export function EventForm({
  action,
  submitLabel,
  siteId,
  values,
}: EventFormProps) {
  const t = useTranslations("EventForm");
  const status = useTranslations("Status");
  const common = useTranslations("Common");
  const [state, formAction] = useActionState(action, initialActionState);
  // Drives the price step: FCFA is whole-number, dollars and euros are not.
  const [currency, setCurrency] = useState(values?.currency ?? DEFAULT_CURRENCY);
  const cls = (field: string) =>
    state.fieldErrors?.[field] ? "input input-error" : "input";

  return (
    <form action={formAction} className="card space-y-6 sm:p-6">
      {siteId ? <input type="hidden" name="siteId" value={siteId} /> : null}
      {values?.id ? <input type="hidden" name="eventId" value={values.id} /> : null}

      <FormSection title={t("groupBasics")}>
        <Field label={t("title")}>
          <input
            className={cls("title")}
            name="title"
            defaultValue={values?.title ?? ""}
            required
            minLength={3}
          />
        </Field>

        <Field label={`${t("description")} (${common("optional")})`}>
          <textarea
            className={cls("description")}
            name="description"
            rows={4}
            defaultValue={values?.description ?? ""}
          />
        </Field>

        <Field
          label={`${t("location")} (${common("optional")})`}
          hint={t("locationHint")}
        >
          <input
            className={cls("location")}
            name="location"
            defaultValue={values?.location ?? ""}
          />
        </Field>
      </FormSection>

      <FormSection title={t("groupPhotos")} description={t("groupPhotosHint")}>
        <CoverImageField currentUrl={values?.coverImageUrl ?? null} />
        <GalleryField images={values?.images ?? []} />
      </FormSection>

      <FormSection title={t("groupSchedule")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("startsAt")}>
            <input
              className={cls("startsAt")}
              type="datetime-local"
              name="startsAt"
              defaultValue={toDateTimeLocal(values?.startsAt)}
              required
            />
          </Field>

          <Field label={`${t("endsAt")} (${common("optional")})`}>
            <input
              className={cls("endsAt")}
              type="datetime-local"
              name="endsAt"
              defaultValue={toDateTimeLocal(values?.endsAt)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={t("groupTickets")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("capacity")} hint={t("capacityHint")}>
            <input
              className={cls("capacity")}
              type="number"
              name="capacity"
              min={1}
              defaultValue={values?.capacity ?? ""}
            />
          </Field>

          <Field label={t("price")}>
            <input
              className={cls("price")}
              type="number"
              name="price"
              min="0"
              step={hasSubunits(currency) ? "0.01" : "1"}
              defaultValue={toAmountInput(
                values?.priceCents ?? 0,
                values?.currency ?? DEFAULT_CURRENCY,
              )}
            />
          </Field>

          <Field label={t("currency")}>
            <select
              className={cls("currency")}
              name="currency"
              defaultValue={values?.currency ?? DEFAULT_CURRENCY}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("status")}>
            <select
              className={cls("status")}
              name="status"
              defaultValue={values?.status ?? "DRAFT"}
            >
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {status(option)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      <div className="space-y-3 border-t border-line pt-5">
        <FormMessage state={state} />
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
