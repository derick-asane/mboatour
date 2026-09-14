"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { FormMessage, SubmitButton } from "@/components/form";
import { MAX_RATING, MAX_REVIEW_LENGTH, MIN_RATING } from "@/lib/reviews";
import { initialActionState } from "@/server/action-state";
import { submitReviewAction } from "@/server/actions/reviews";

/// Radio buttons underneath, so the rating works without JavaScript and reads
/// correctly to a screen reader; the stars are the visible half of the same
/// control.
export function ReviewForm({
  siteId,
  currentRating,
  currentBody,
}: {
  siteId: string;
  currentRating: number | null;
  currentBody: string | null;
}) {
  const t = useTranslations("Reviews");
  const [state, formAction] = useActionState(submitReviewAction, initialActionState);
  const [rating, setRating] = useState(currentRating ?? 0);
  const [hovered, setHovered] = useState(0);

  const shown = hovered || rating;

  return (
    <form action={formAction} className="card space-y-4 sm:p-6">
      <input type="hidden" name="siteId" value={siteId} />

      <div>
        <span className="label">{t("yourRating")}</span>

        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {Array.from({ length: MAX_RATING }, (_, index) => {
            const value = index + MIN_RATING;

            return (
              <label
                key={value}
                className="cursor-pointer p-0.5 text-warning"
                onMouseEnter={() => setHovered(value)}
                title={t("starLabel", { count: value })}
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="sr-only"
                  required
                />
                <span className="sr-only">{t("starLabel", { count: value })}</span>
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill={value <= shown ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  className={`h-7 w-7 transition ${
                    value <= shown ? "" : "opacity-35"
                  }`}
                >
                  <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9L12 3.6Z" />
                </svg>
              </label>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="label">{t("yourReview")}</span>
        <textarea
          className="input"
          name="body"
          rows={4}
          maxLength={MAX_REVIEW_LENGTH}
          defaultValue={currentBody ?? ""}
          placeholder={t("bodyPlaceholder")}
        />
      </label>

      <div className="space-y-3">
        <FormMessage state={state} />
        <SubmitButton>
          {currentRating ? t("updateReview") : t("postReview")}
        </SubmitButton>
      </div>
    </form>
  );
}
