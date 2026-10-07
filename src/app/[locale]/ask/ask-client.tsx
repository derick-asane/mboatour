"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { CoverImage } from "@/components/cover-image";
import { RatingSummary } from "@/components/reviews/stars";
import { Link } from "@/i18n/navigation";
import { VoiceButton } from "@/app/[locale]/ask/voice-button";
import { initialAssistantState, MAX_QUESTION_LENGTH } from "@/lib/assistant";
import { askAssistantAction } from "@/server/actions/assistant";

function AskButton() {
  const t = useTranslations("Assistant");
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? <span aria-hidden className="spinner" /> : null}
      {pending ? t("thinking") : t("ask")}
    </button>
  );
}

export function AskClient({ examples }: { examples: string[] }) {
  const t = useTranslations("Assistant");
  const kinds = useTranslations("PlaceKinds");
  const reviews = useTranslations("Reviews");
  const errors = useTranslations("Errors");
  const [state, formAction] = useActionState(
    askAssistantAction,
    initialAssistantState,
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="card space-y-4 sm:p-6">
        <label className="block">
          <span className="label">{t("questionLabel")}</span>
          <textarea
            className="input min-h-24"
            name="question"
            defaultValue={state.question ?? ""}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder={t("placeholder")}
            required
            minLength={3}
          />
        </label>

        {/* Something to press on an empty page, which also shows the kind of
            question this can answer. */}
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="submit"
              name="question"
              value={example}
              className="badge hover:border-accent-border hover:text-accent"
            >
              {example}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <VoiceButton
            onRecorded={(file) => {
              const spoken = new FormData();
              spoken.set("audio", file);
              formAction(spoken);
            }}
          />
          <AskButton />
        </div>

        <p className="hint">{t("disclaimer")}</p>
      </form>

      {state.error ? (
        <p className="alert alert-warning">
          {errors.has(state.error) ? errors(state.error) : t("failed")}
        </p>
      ) : null}

      {state.answer ? (
        <section className="space-y-4">
          {state.spoken && state.question ? (
            <p className="hint">{t("heardYouSay", { question: state.question })}</p>
          ) : null}

          <div className="card space-y-2">
            <p className="eyebrow">{t("answerTitle")}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {state.answer}
            </p>
          </div>

          {state.recommendations && state.recommendations.length > 0 ? (
            <div className="space-y-3">
              <h2 className="section-title text-base">{t("recommended")}</h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {state.recommendations.map((place) => (
                  <Link
                    key={place.slug}
                    href={place.href}
                    className="card card-flush card-interactive group flex flex-col"
                  >
                    <div className="relative">
                      <CoverImage
                        src={place.coverImageUrl}
                        alt=""
                        className="h-32 w-full object-cover"
                      />
                      <span className="badge absolute left-3 top-3 bg-surface/90 backdrop-blur">
                        {kinds(place.kind)}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <h3 className="font-semibold tracking-tight transition group-hover:text-accent">
                        {place.name}
                      </h3>

                      {[place.city, place.country].filter(Boolean).length > 0 ? (
                        <p className="text-xs text-muted">
                          {[place.city, place.country].filter(Boolean).join(", ")}
                        </p>
                      ) : null}

                      {place.summary ? (
                        <p className="line-clamp-2 text-sm text-muted">
                          {place.summary}
                        </p>
                      ) : null}

                      <div className="mt-auto pt-2">
                        <RatingSummary
                          average={place.ratingAverage}
                          count={place.ratingCount}
                          label={reviews("count", { count: place.ratingCount })}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="hint">{t("noneMatched")}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
