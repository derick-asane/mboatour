import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ChatRoom } from "@/components/chat/chat-room";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import {
  deleteGuideMessageAction,
  editGuideMessageAction,
  postGuideMessageAction,
} from "@/server/actions/guide-chat";
import { listGuideMessages, loadGuideChatAccess } from "@/server/guide-chat";

/// The conversation between a traveller and their guide, opened by the guide
/// accepting. Only these two ever see it.
export default async function GuideBookingChatPage({
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
  const guideT = await getTranslations("GuideBooking");
  const format = await getFormatter();

  const messages = await listGuideMessages(bookingId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          {access.counterpart.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={access.counterpart.photoUrl}
              alt=""
              className="media-placeholder h-16 w-16 shrink-0 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="avatar h-16 w-16 text-xl">
              {access.counterpart.name.trim().charAt(0) || "?"}
            </span>
          )}

          <div className="min-w-0 space-y-1.5">
            <p className="eyebrow">
              {access.isGuide ? t("withTraveller") : t("withGuide")}
            </p>
            <h1 className="page-title">{access.counterpart.name}</h1>
            <p className="meta">
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

        <Link
          href={access.isGuide ? "/guide/bookings" : "/dashboard"}
          className="btn-secondary btn-sm"
        >
          {access.isGuide ? guideT("backToRequests") : t("backToDashboard")}
        </Link>
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

      {access.closed ? <p className="alert">{t("closedNotice")}</p> : null}

      <div className="h-[30rem] sm:h-[34rem]">
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
