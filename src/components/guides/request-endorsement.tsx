"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { requestEndorsementAction } from "@/server/actions/guides";

/// Shown on a site page to someone who guides: the place to ask that site to
/// vouch for them. Without this the site's endorsement queue can only be filled
/// by hand.
export function RequestEndorsement({
  siteId,
  siteName,
  status,
  note,
}: {
  siteId: string;
  siteName: string;
  /// Where this guide already stands with this site, if anywhere.
  status: "PENDING" | "APPROVED" | "REJECTED" | null;
  note: string | null;
}) {
  const t = useTranslations("Guides");
  const [state, formAction] = useActionState(
    requestEndorsementAction,
    initialActionState,
  );

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="section-title text-base">{t("endorseMeTitle")}</h2>
        <p className="hint">{t("endorseMeHint", { site: siteName })}</p>
      </div>

      {status === "APPROVED" ? (
        <p className="alert alert-success">{t("endorseMeApproved", { site: siteName })}</p>
      ) : status === "PENDING" ? (
        <p className="alert">{t("endorseMePending")}</p>
      ) : (
        <>
          {status === "REJECTED" ? (
            <p className="alert alert-error">
              {note ?? t("endorseMeRejected")}
            </p>
          ) : null}

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="siteId" value={siteId} />
            <SubmitButton className="btn-secondary btn-sm">
              {status === "REJECTED" ? t("endorseMeAgain") : t("endorseMeCta")}
            </SubmitButton>
            <FormMessage state={state} />
          </form>
        </>
      )}
    </section>
  );
}
