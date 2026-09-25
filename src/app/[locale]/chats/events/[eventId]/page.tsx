import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ChatRoom } from "@/components/chat/chat-room";
import { Participants } from "@/components/chat/participants";
import { CoverImage } from "@/components/cover-image";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import {
  deleteMessageAction,
  editMessageAction,
  postMessageAction,
} from "@/server/actions/chat";
import { chatClosesAt, listMessages, loadChatAccess } from "@/server/chat";

/// An event's group chat, opened from the inbox. Everyone with a live booking
/// is in it, along with the site team, who may moderate.
export default async function EventConversationPage({
  params,
}: {
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = await params;
  setRequestLocale(locale);

  const access = await loadChatAccess(eventId);

  // Anyone without a seat or a team badge is shown a 404, not a locked door.
  if (!access) notFound();

  const t = await getTranslations("Chat");
  const format = await getFormatter();

  const [messages, attendees, team, mutes] = await Promise.all([
    listMessages(eventId),
    prisma.booking.findMany({
      where: { eventId, status: { not: "CANCELLED" } },
      select: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.siteMember.findMany({
      where: { siteId: access.event.siteId },
      select: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.eventChatMute.findMany({
      where: { eventId },
      select: { userId: true },
    }),
  ]);

  const mutedIds = new Set(mutes.map((mute) => mute.userId));
  const teamIds = new Set(team.map((member) => member.user.id));

  // Display names only: an attendee's email is not the chat's business.
  const participants = [...team, ...attendees]
    .map((row) => row.user)
    .filter(
      (user, index, all) => all.findIndex((other) => other.id === user.id) === index,
    )
    .map((user) => ({
      id: user.id,
      name: user.name ?? user.email.split("@")[0],
      imageUrl: user.image,
      isTeam: teamIds.has(user.id),
      muted: mutedIds.has(user.id),
    }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        {/* The photo says which room this is at a glance, which matters once
            somebody is in more than one chat. */}
        <div className="flex items-center gap-3">
          <CoverImage
            src={access.event.coverImageUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl border border-line"
          />

          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              {access.event.title}
            </h2>
            <p className="meta">
              {access.event.siteName}
              {" · "}
              {format.dateTime(access.event.startsAt, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        <Link
          href={`/sites/${access.event.siteSlug}`}
          className="btn-secondary btn-sm"
        >
          {t("backToSite")}
        </Link>
      </div>

      {access.closed ? (
        <p className="alert shrink-0">{t("closedNotice")}</p>
      ) : (
        <p className="hint shrink-0">
          {t("openUntil", {
            date: format.dateTime(chatClosesAt(access.event), {
              dateStyle: "medium",
            }),
          })}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_13rem]">
        <div className="h-[62dvh] min-h-0 lg:h-auto">
          <ChatRoom
            endpoint={`/api/events/${eventId}/messages`}
            hiddenFields={{ eventId }}
            postAction={postMessageAction}
            deleteAction={deleteMessageAction}
            editAction={editMessageAction}
            currentUserId={access.user.id}
            canModerate={access.isTeam}
            initialMessages={messages}
            canPost={access.canPost}
            closed={access.closed}
            muted={access.muted}
          />
        </div>

        <div className="min-h-0 xl:overflow-y-auto">
          <Participants
            eventId={eventId}
            participants={participants}
            canModerate={access.isTeam}
          />
        </div>
      </div>
    </div>
  );
}
