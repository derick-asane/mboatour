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
import { CoordinateFields } from "@/components/map/coordinate-fields";
import { SITE_CATEGORIES } from "@/lib/categories";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  hasSubunits,
  toAmountInput,
} from "@/lib/currencies";
import { initialActionState, type ActionState } from "@/server/action-state";

export type SiteFormValues = {
  id?: string;
  name: string;
  summary: string | null;
  description: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  openingHours: string | null;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string | null;
  images: { id: string; url: string }[];
  currency: string;
  entryFeeCents: number;
  published: boolean;
};

type SiteFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  values?: SiteFormValues;
};

export function SiteForm({ action, submitLabel, values }: SiteFormProps) {
  const t = useTranslations("SiteForm");
  const common = useTranslations("Common");
  const categories = useTranslations("Categories");
  const [state, formAction] = useActionState(action, initialActionState);
  // Drives the price step: FCFA is whole-number, dollars and euros are not.
  const [currency, setCurrency] = useState(values?.currency ?? DEFAULT_CURRENCY);
  const cls = (field: string) =>
    state.fieldErrors?.[field] ? "input input-error" : "input";

  return (
    <form action={formAction} className="card space-y-6 sm:p-6">
      {values?.id ? <input type="hidden" name="siteId" value={values.id} /> : null}

      <FormSection title={t("groupBasics")}>
        <Field label={t("name")}>
          <input
            className={cls("name")}
            name="name"
            defaultValue={values?.name ?? ""}
            required
            minLength={3}
          />
        </Field>

        <Field
          label={`${t("summary")} (${common("optional")})`}
          hint={t("summaryHint")}
        >
          <input
            className={cls("summary")}
            name="summary"
            defaultValue={values?.summary ?? ""}
            maxLength={280}
          />
        </Field>

        <Field label={`${t("description")} (${common("optional")})`}>
          <textarea
            className={cls("description")}
            name="description"
            rows={5}
            defaultValue={values?.description ?? ""}
          />
        </Field>

        <Field label={t("category")} hint={t("categoryHint")}>
          <select
            className={cls("category")}
            name="category"
            defaultValue={values?.category ?? ""}
          >
            <option value="">{t("categoryPlaceholder")}</option>
            {SITE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categories(category)}
              </option>
            ))}
          </select>
        </Field>
      </FormSection>

      <FormSection title={t("groupPhotos")} description={t("groupPhotosHint")}>
        <CoverImageField currentUrl={values?.coverImageUrl ?? null} />
        <GalleryField images={values?.images ?? []} />
      </FormSection>

      <FormSection title={t("groupLocation")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("address")}>
            <input
              className={cls("address")}
              name="address"
              defaultValue={values?.address ?? ""}
            />
          </Field>

          <Field label={t("openingHours")}>
            <input
              className={cls("openingHours")}
              name="openingHours"
              defaultValue={values?.openingHours ?? ""}
            />
          </Field>

          <Field label={t("city")}>
            <input
              className={cls("city")}
              name="city"
              defaultValue={values?.city ?? ""}
            />
          </Field>

          <Field label={t("country")}>
            <input
              className={cls("country")}
              name="country"
              defaultValue={values?.country ?? ""}
            />
          </Field>
        </div>

        <CoordinateFields
          latitude={values?.latitude ?? null}
          longitude={values?.longitude ?? null}
          invalidClass={cls}
        />
      </FormSection>

      <FormSection title={t("groupVisiting")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("entryFee")}>
            <input
              className={cls("entryFee")}
              name="entryFee"
              type="number"
              min="0"
              step={hasSubunits(currency) ? "0.01" : "1"}
              defaultValue={toAmountInput(
                values?.entryFeeCents ?? 0,
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
        </div>

        <label className="check-tile">
          <input
            type="checkbox"
            name="published"
            defaultChecked={values?.published ?? false}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">{t("published")}</span>
            <span className="hint block">{t("publishedHint")}</span>
          </span>
        </label>
      </FormSection>

      <div className="space-y-3 border-t border-line pt-5">
        <FormMessage state={state} />
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
