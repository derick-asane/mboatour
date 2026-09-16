"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
} from "@/components/form";
import { CURRENCIES, DEFAULT_CURRENCY, toAmountInput } from "@/lib/currencies";
import { GUIDE_LANGUAGES, MAX_GUIDE_BIO, MAX_GUIDE_HEADLINE } from "@/lib/guides";
import { initialActionState } from "@/server/action-state";
import { saveGuideProfileAction } from "@/server/actions/guides";

export type GuideFormValues = {
  headline: string;
  bio: string;
  languages: string[];
  city: string | null;
  country: string | null;
  phone: string | null;
  whatsapp: string | null;
  photoUrl: string | null;
  yearsExperience: number | null;
  hourlyRateCents: number | null;
  dailyRateCents: number | null;
  currency: string;
};

export function GuideForm({ values }: { values?: GuideFormValues }) {
  const t = useTranslations("Guides");
  const languages = useTranslations("Languages");
  const common = useTranslations("Common");
  const [state, formAction] = useActionState(
    saveGuideProfileAction,
    initialActionState,
  );
  const cls = (field: string) =>
    state.fieldErrors?.[field] ? "input input-error" : "input";

  const currency = values?.currency ?? DEFAULT_CURRENCY;

  return (
    <form action={formAction} className="card space-y-6 sm:p-6">
      <FormSection title={t("groupAbout")}>
        <Field label={t("headline")} hint={t("headlineHint")}>
          <input
            className={cls("headline")}
            name="headline"
            maxLength={MAX_GUIDE_HEADLINE}
            defaultValue={values?.headline ?? ""}
            required
            minLength={10}
          />
        </Field>

        <Field label={t("bio")} hint={t("bioHint")}>
          <textarea
            className={cls("bio")}
            name="bio"
            rows={6}
            maxLength={MAX_GUIDE_BIO}
            defaultValue={values?.bio ?? ""}
            required
            minLength={40}
          />
        </Field>

        <div>
          <span className="label">{t("languages")}</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {GUIDE_LANGUAGES.map((code) => (
              <label key={code} className="check-tile items-center">
                <input
                  type="checkbox"
                  name="languages"
                  value={code}
                  defaultChecked={values?.languages.includes(code)}
                />
                <span>{languages(code)}</span>
              </label>
            ))}
          </div>
          <p className="hint">{t("languagesHint")}</p>
        </div>
      </FormSection>

      <FormSection title={t("groupPhoto")}>
        <div className="flex flex-wrap items-center gap-4">
          {values?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={values.photoUrl}
              alt=""
              className="media-placeholder h-20 w-20 shrink-0 rounded-full border border-line object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="media-placeholder h-20 w-20 shrink-0 rounded-full border border-dashed border-line-strong"
            />
          )}

          <label className="min-w-48 flex-1">
            <span className="label">{t("photo")}</span>
            <input className="input" type="file" name="photo" accept="image/*" />
            <span className="hint block">{t("photoHint")}</span>
          </label>
        </div>
      </FormSection>

      <FormSection title={t("groupReach")}>
        <div className="grid gap-4 sm:grid-cols-2">
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

          <Field label={t("phone")} hint={t("phoneHint")}>
            <input
              className={cls("phone")}
              name="phone"
              type="tel"
              placeholder="+237 6XX XX XX XX"
              defaultValue={values?.phone ?? ""}
            />
          </Field>

          <Field label={t("whatsapp")}>
            <input
              className={cls("whatsapp")}
              name="whatsapp"
              type="tel"
              placeholder="+237 6XX XX XX XX"
              defaultValue={values?.whatsapp ?? ""}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={t("groupRates")} description={t("ratesHint")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={`${t("hourlyRate")} (${common("optional")})`}>
            <input
              className={cls("hourlyRate")}
              name="hourlyRate"
              type="number"
              min="0"
              step="1"
              defaultValue={
                values?.hourlyRateCents === null ||
                values?.hourlyRateCents === undefined
                  ? ""
                  : toAmountInput(values.hourlyRateCents, currency)
              }
            />
          </Field>

          <Field label={`${t("dailyRate")} (${common("optional")})`}>
            <input
              className={cls("dailyRate")}
              name="dailyRate"
              type="number"
              min="0"
              step="1"
              defaultValue={
                values?.dailyRateCents === null ||
                values?.dailyRateCents === undefined
                  ? ""
                  : toAmountInput(values.dailyRateCents, currency)
              }
            />
          </Field>

          <Field label={t("currency")}>
            <select
              className={cls("currency")}
              name="currency"
              defaultValue={currency}
            >
              {CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={`${t("yearsExperience")} (${common("optional")})`}>
          <input
            className={cls("yearsExperience")}
            name="yearsExperience"
            type="number"
            min={0}
            max={70}
            defaultValue={values?.yearsExperience ?? ""}
          />
        </Field>
      </FormSection>

      <div className="space-y-3 border-t border-line pt-5">
        <FormMessage state={state} />
        <SubmitButton>{values ? t("saveProfile") : t("createProfile")}</SubmitButton>
      </div>
    </form>
  );
}
