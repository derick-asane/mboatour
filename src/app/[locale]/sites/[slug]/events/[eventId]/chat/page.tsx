import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Participants } from "@/app/[locale]/sites/[slug]/events/[eventId]/chat/participants";
import { ChatList } from "@/components/chat/chat-list";
import { ChatRoom } from "@/components/chat/chat-room";
import {
  deleteMessageAction,
  editMessageAction,
  postMessageAction,
} from "@/server/actions/chat";
import { CoverImage } from "@/components/cover-image";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import {
  chatClosesAt,
  listMessages,
  listMyChats,
  loadChatAccess,
} from "@/server/chat";

export default async function EventChatPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; eventId: string }>;
}) {
  const { locale, slug, eventId } = await params;
  setRequestLocale(locale);

  const access = await loadChatAccess(eventId);

  // Anyone without a seat or a team badge is shown a 404, not a locked door.
  if (!access || access.event.siteSlug !== slug) notFound();

  const t = await getTranslations("Chat");
  const format = await getFormatter();

  const [messages, myChats, attendees, team, mutes] = await Promise.all([
    listMessages(eventId),
    listMyChats(access.user.id),
    prisma.booking.findMany({
      where: { eventId, status: { not: "CANCELLED" } },
      select: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.siteMember.findMany({
      where: { siteId: access.event.siteId },
      select: { user: { select: { id: true, name: true, email: true } } },
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
      isTeam: teamIds.has(user.id),
      muted: mutedIds.has(user.id),
    }));

  return (
    <div className="flex flex-col gap-4 lg:-my-10 lg:h-[calc(100dvh-3.5rem)] lg:py-6">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        {/* The photo says which room this is at a glance, which matters once
            somebody is in more than one chat. */}
        <div className="flex items-center gap-4">
          <CoverImage
            src={access.event.coverImageUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl border border-line sm:h-20 sm:w-20"
          />

          <div className="min-w-0 space-y-1.5">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="page-title">{access.event.title}</h1>
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

        <Link href={`/sites/${slug}`} className="btn-secondary btn-sm">
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

      <div className="grid min-h-0 gap-5 lg:flex-1 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_15rem]">
        <div className="min-h-0 lg:overflow-y-auto">
          <ChatList chats={myChats} activeEventId={eventId} />
        </div>

        <div className="h-[68dvh] min-h-0 lg:h-auto">
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

        <div className="min-h-0 lg:col-span-2 lg:overflow-y-auto xl:col-span-1">
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
