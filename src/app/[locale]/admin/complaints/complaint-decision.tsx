"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { FormMessage } from "@/components/form";
import { COMPLAINT_OUTCOMES } from "@/lib/complaints";
import { initialActionState } from "@/server/action-state";
import { decideComplaintAction } from "@/server/actions/complaints";

/// The platform team's controls on one complaint. Picking it up is one press;
/// closing it asks what was concluded, because a closed complaint that does not
/// say what came of it is not a record of anything.
export function ComplaintDecision({
  complaintId,
  status,
}: {
  complaintId: string;
  status: string;
}) {
  const t = useTranslations("Complaints");
  const [state, formAction] = useActionState(
    decideComplaintAction,
    initialActionState,
  );
  const [outcome, setOutcome] = useState<string>("NO_ACTION");

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-line surface-muted p-3"
    >
      <input type="hidden" name="complaintId" value={complaintId} />

      <label className="block">
        <span className="label">{t("resolution")}</span>
        <input className="input" name="resolution" maxLength={1000} />
        <span className="hint block">{t("resolutionHint")}</span>
      </label>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block">
          <span className="label">{t("outcome")}</span>
          <select
            className="input"
            name="outcome"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
          >
            {COMPLAINT_OUTCOMES.map((value) => (
              <option key={value} value={value}>
                {t(`outcome${value}`)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          {status === "OPEN" ? (
            <button
              type="submit"
              name="status"
              value="REVIEWING"
              className="btn-secondary"
            >
              {t("pickUp")}
            </button>
          ) : null}

          <button
            type="submit"
            name="status"
            value="DISMISSED"
            className="btn-secondary"
          >
            {t("dismiss")}
          </button>

          <button
            type="submit"
            name="status"
            value="RESOLVED"
            className={outcome === "SUSPENDED" ? "btn-danger" : "btn-primary"}
          >
            {t("resolve")}
          </button>
        </div>
      </div>

      {/* Suspension takes the guide out of the directory, so it says so before
          the press rather than after. */}
      {outcome === "SUSPENDED" ? (
        <p className="alert alert-warning">{t("suspendWarning")}</p>
      ) : null}

      <FormMessage state={state} />
    </form>
  );
}
