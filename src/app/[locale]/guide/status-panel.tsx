"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { submitGuideForReviewAction } from "@/server/actions/guides";

const TONES: Record<string, string> = {
  DRAFT: "",
  PENDING: "badge-warning",
  VERIFIED: "badge-success",
  SUSPENDED: "badge-danger",
};

/// Where a guide stands with the platform, and which sites vouch for them.
export function GuideStatusPanel({
  status,
  reviewNote,
  endorsements,
}: {
  status: string;
  reviewNote: string | null;
  endorsements: {
    id: string;
    siteName: string;
    status: string;
    note: string | null;
  }[];
}) {
  const t = useTranslations("Guides");
  const [state, formAction] = useActionState(
    submitGuideForReviewAction,
    initialActionState,
  );

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="section-title text-base">{t("statusTitle")}</h2>
          <p className="hint">{t(`status${status}Hint`)}</p>
        </div>
        <span className={`badge ${TONES[status] ?? ""}`}>{t(status)}</span>
      </div>

      {reviewNote ? <p className="alert">{reviewNote}</p> : null}

      {status === "DRAFT" || status === "REJECTED" ? (
        <form action={formAction} className="space-y-3">
          <SubmitButton className="btn-primary btn-sm">
            {t("submitForReview")}
          </SubmitButton>
          <FormMessage state={state} />
        </form>
      ) : (
        <FormMessage state={state} />
      )}

      <div className="space-y-2 border-t border-line pt-4">
        <h3 className="text-sm font-semibold">{t("endorsementsTitle")}</h3>
        <p className="hint">{t("endorsementsHint")}</p>

        {endorsements.length === 0 ? (
          <p className="text-sm text-muted">{t("noEndorsements")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {endorsements.map((endorsement) => (
              <li
                key={endorsement.id}
                className={`badge ${
                  endorsement.status === "APPROVED"
                    ? "badge-success"
                    : endorsement.status === "REJECTED"
                      ? "badge-danger"
                      : "badge-warning"
                }`}
                title={endorsement.note ?? undefined}
              >
                {endorsement.siteName}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
