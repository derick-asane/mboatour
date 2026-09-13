import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Participants } from "@/app/[locale]/sites/[slug]/events/[eventId]/chat/participants";
import { ChatRoom } from "@/components/chat/chat-room";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { chatClosesAt, listMessages, loadChatAccess } from "@/server/chat";

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

  const [messages, attendees, team, mutes] = await Promise.all([
    listMessages(eventId),
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
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

        <Link href={`/sites/${slug}`} className="btn-secondary btn-sm">
          {t("backToSite")}
        </Link>
      </div>

      {access.closed ? (
        <p className="alert">{t("closedNotice")}</p>
      ) : (
        <p className="hint">
          {t("openUntil", {
            date: format.dateTime(chatClosesAt(access.event), {
              dateStyle: "medium",
            }),
          })}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="h-[32rem] lg:h-[36rem]">
          <ChatRoom
            eventId={eventId}
            currentUserId={access.user.id}
            isTeam={access.isTeam}
            initialMessages={messages}
            canPost={access.canPost}
            closed={access.closed}
            muted={access.muted}
          />
        </div>

        <Participants
          eventId={eventId}
          participants={participants}
          canModerate={access.isTeam}
        />
      </div>
    </div>
  );
}
