import { getFormatter, getTranslations } from "next-intl/server";

import { Avatar } from "@/components/avatar";
import { ReviewControls } from "@/components/reviews/review-controls";
import { Stars } from "@/components/reviews/stars";

export type ReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  editedAt: Date | null;
  authorName: string;
  authorImage: string | null;
  isMine: boolean;
  hidden: boolean;
  reply: string | null;
  repliedAt: Date | null;
};

export async function ReviewList({
  reviews,
  siteName,
  canModerate,
  canReply,
}: {
  reviews: ReviewRow[];
  siteName: string;
  /// Platform admins only: hiding is the remedy for abuse, not a bad score.
  canModerate: boolean;
  /// The site team, who may answer but never remove.
  canReply: boolean;
}) {
  const t = await getTranslations("Reviews");
  const format = await getFormatter();

  if (reviews.length === 0) {
    return <p className="empty-state">{t("none")}</p>;
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li
          key={review.id}
          className={`card space-y-3 ${review.hidden ? "opacity-60" : ""}`}
        >
          <div className="flex flex-wrap items-start gap-3">
            <Avatar
              name={review.authorName}
              imageUrl={review.authorImage}
              className="shrink-0"
            />

            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {review.isMine ? t("you") : review.authorName}
                <Stars rating={review.rating} className="h-3.5 w-3.5" />
                {review.hidden ? (
                  <span className="badge badge-danger">{t("hidden")}</span>
                ) : null}
              </p>

              <p className="text-xs text-faint">
                {format.dateTime(review.createdAt, { dateStyle: "medium" })}
                {review.editedAt ? ` · ${t("editedMark")}` : ""}
              </p>
            </div>
          </div>

          {review.body ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
              {review.body}
            </p>
          ) : null}

          {review.reply ? (
            <div className="rounded-xl border border-line surface-muted p-3">
              <p className="text-xs font-medium">
                {t("replyFrom", { site: siteName })}
                {review.repliedAt
                  ? ` · ${format.dateTime(review.repliedAt, { dateStyle: "medium" })}`
                  : ""}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted">
                {review.reply}
              </p>
            </div>
          ) : null}

          <ReviewControls
            reviewId={review.id}
            isMine={review.isMine}
            hidden={review.hidden}
            canModerate={canModerate}
            canReply={canReply}
            currentReply={review.reply}
          />
        </li>
      ))}
    </ul>
  );
}
