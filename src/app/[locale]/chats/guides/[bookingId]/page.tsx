import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ChatRoom } from "@/components/chat/chat-room";
import { formatMoney } from "@/lib/format";
import {
  deleteGuideMessageAction,
  editGuideMessageAction,
  postGuideMessageAction,
} from "@/server/actions/guide-chat";
import { listGuideMessages, loadGuideChatAccess } from "@/server/guide-chat";

/// The conversation between a traveller and their guide, opened by the guide
/// accepting. Only these two ever see it, so unlike an event chat there is no
/// participant list and nobody moderates.
export default async function GuideConversationPage({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;
  setRequestLocale(locale);

  const access = await loadGuideChatAccess(bookingId);

  // Anyone else, and anyone whose request is still unanswered, gets a 404
  // rather than a locked door.
  if (!access) notFound();

  const t = await getTranslations("GuideChat");
  const format = await getFormatter();

  const messages = await listGuideMessages(bookingId);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {access.counterpart.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={access.counterpart.photoUrl}
              alt=""
              className="media-placeholder h-14 w-14 shrink-0 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="avatar h-14 w-14 text-lg">
              {access.counterpart.name.trim().charAt(0) || "?"}
            </span>
          )}

          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              {access.counterpart.name}
            </h2>
            <p className="meta">
              {access.isGuide ? t("withTraveller") : t("withGuide")}
              {" · "}
              {format.dateTime(access.booking.startDate, { dateStyle: "medium" })}
              {access.booking.endDate
                ? ` – ${format.dateTime(access.booking.endDate, { dateStyle: "medium" })}`
                : ""}
              {access.booking.amountCents > 0
                ? ` · ${formatMoney(access.booking.amountCents, access.booking.currency, locale)}`
                : ""}
            </p>
          </div>
        </div>

        {access.siteNames.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {access.siteNames.map((name) => (
              <span key={name} className="badge">
                {name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {access.closed ? (
        <p className="alert shrink-0">{t("closedNotice")}</p>
      ) : null}

      <div className="h-[62dvh] min-h-0 flex-1 lg:h-auto">
        <ChatRoom
          endpoint={`/api/guide-bookings/${bookingId}/messages`}
          hiddenFields={{ bookingId }}
          postAction={postGuideMessageAction}
          deleteAction={deleteGuideMessageAction}
          editAction={editGuideMessageAction}
          currentUserId={access.user.id}
          initialMessages={messages}
          canPost={access.canPost}
          closed={access.closed}
        />
      </div>
    </div>
  );
}
