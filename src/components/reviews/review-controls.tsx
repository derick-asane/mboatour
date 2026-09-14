"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { FormMessage, SubmitButton } from "@/components/form";
import { MAX_REVIEW_LENGTH } from "@/lib/reviews";
import { initialActionState } from "@/server/action-state";
import {
  deleteOwnReviewAction,
  hideReviewAction,
  replyToReviewAction,
} from "@/server/actions/reviews";

/// What each reader may do with a review: take back their own, answer it as the
/// site, or hide it as the platform.
export function ReviewControls({
  reviewId,
  isMine,
  hidden,
  canModerate,
  canReply,
  currentReply,
}: {
  reviewId: string;
  isMine: boolean;
  hidden: boolean;
  canModerate: boolean;
  canReply: boolean;
  currentReply: string | null;
}) {
  const t = useTranslations("Reviews");
  const [replying, setReplying] = useState(false);
  const [removeState, removeAction] = useActionState(
    deleteOwnReviewAction,
    initialActionState,
  );
  const [hideState, hideAction] = useActionState(
    hideReviewAction,
    initialActionState,
  );
  const [replyState, replyAction] = useActionState(
    replyToReviewAction,
    initialActionState,
  );

  if (!isMine && !canModerate && !canReply) return null;

  return (
    <div className="space-y-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-3">
        {isMine ? (
          <form action={removeAction}>
            <input type="hidden" name="reviewId" value={reviewId} />
            <SubmitButton className="btn-danger btn-sm">
              {t("deleteReview")}
            </SubmitButton>
          </form>
        ) : null}

        {canReply ? (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setReplying((open) => !open)}
          >
            {currentReply ? t("editReply") : t("reply")}
          </button>
        ) : null}

        {canModerate ? (
          <form action={hideAction}>
            <input type="hidden" name="reviewId" value={reviewId} />
            <SubmitButton
              className={hidden ? "btn-secondary btn-sm" : "btn-danger btn-sm"}
            >
              {hidden ? t("restore") : t("hide")}
            </SubmitButton>
          </form>
        ) : null}
      </div>

      {replying ? (
        <form action={replyAction} className="space-y-2">
          <input type="hidden" name="reviewId" value={reviewId} />
          <textarea
            className="input"
            name="reply"
            rows={3}
            maxLength={MAX_REVIEW_LENGTH}
            defaultValue={currentReply ?? ""}
            placeholder={t("replyPlaceholder")}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton className="btn-primary btn-sm">
              {t("saveReply")}
            </SubmitButton>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setReplying(false)}
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : null}

      <FormMessage state={removeState} />
      <FormMessage state={hideState} />
      <FormMessage state={replyState} />
    </div>
  );
}
