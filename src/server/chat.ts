import { CHAT_GRACE_DAYS, MAX_MESSAGE_LENGTH } from "@/lib/chat-limits";
import { isPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type SessionUser } from "@/server/session";

/// Who belongs in an event chat is never stored: it is derived from bookings
/// and site membership, so booking or cancelling changes access immediately
/// with no list to keep in sync.

export { CHAT_GRACE_DAYS, MAX_MESSAGE_LENGTH };

export type ChatAccess = {
  user: SessionUser;
  event: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date | null;
    siteId: string;
    siteName: string;
    siteSlug: string;
    /// The event photo, falling back to the site so the header always shows
    /// something recognisable.
    coverImageUrl: string | null;
  };
  /// A member of the site team, who may moderate.
  isTeam: boolean;
  muted: boolean;
  /// Past the grace period: read-only for everyone.
  closed: boolean;
  canPost: boolean;
};

export function chatClosesAt(event: { startsAt: Date; endsAt: Date | null }): Date {
  const ends = event.endsAt ?? event.startsAt;

  return new Date(ends.getTime() + CHAT_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

/// Returns null when the visitor may not see this chat at all, which callers
/// turn into a 404 rather than a locked door.
export async function loadChatAccess(
  eventId: string,
): Promise<ChatAccess | null> {
  const user = await getCurrentUser();

  if (!user) return null;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      siteId: true,
      coverImageUrl: true,
      site: { select: { name: true, slug: true, coverImageUrl: true } },
    },
  });

  if (!event) return null;

  const [booking, membership, mute] = await Promise.all([
    prisma.booking.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
      select: { status: true },
    }),
    prisma.siteMember.findUnique({
      where: { userId_siteId: { userId: user.id, siteId: event.siteId } },
      select: { role: true, permissions: true },
    }),
    prisma.eventChatMute.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
      select: { id: true },
    }),
  ]);

  // A cancelled booking is not a seat, so it is not a place in the chat.
  const attending = booking !== null && booking.status !== "CANCELLED";

  // Platform admins hold no seat on any site, which is right for verifying a
  // site but wrong here: chat is where strangers talk unsupervised, and the
  // platform team is who gets called when it goes wrong. They moderate on the
  // same terms as the site team.
  const isTeam = membership !== null || isPlatformAdmin(user.platformRole);

  if (!attending && !isTeam) return null;

  const closed = Date.now() > chatClosesAt(event).getTime();
  const muted = mute !== null;

  return {
    user,
    event: {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      siteId: event.siteId,
      siteName: event.site.name,
      siteSlug: event.site.slug,
      coverImageUrl: event.coverImageUrl ?? event.site.coverImageUrl,
    },
    isTeam,
    muted,
    closed,
    canPost: !closed && !muted,
  };
}

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  /// Set when a moderator removed it; the body is replaced before sending.
  removed: boolean;
  edited: boolean;
};

/// The most recent slice of a chat, returned oldest-first for display. The
/// client re-reads the whole window on each poll rather than asking only for
/// newer rows, because a moderator removing an older message has to reach
/// everyone too.
export const MESSAGE_WINDOW = 100;

export async function listMessages(eventId: string): Promise<ChatMessage[]> {
  const messages = await prisma.eventMessage.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    take: MESSAGE_WINDOW,
    select: {
      id: true,
      body: true,
      createdAt: true,
      deletedAt: true,
      editedAt: true,
      userId: true,
      user: { select: { name: true, email: true } },
    },
  });

  return messages.reverse().map((message) => ({
    id: message.id,
    // A removed message never leaves the server with its text.
    body: message.deletedAt ? "" : message.body,
    createdAt: message.createdAt.toISOString(),
    authorId: message.userId,
    // Display names only: an attendee's email is not the chat's business.
    authorName: message.user.name ?? message.user.email.split("@")[0],
    removed: message.deletedAt !== null,
    edited: message.editedAt !== null,
  }));
}

export type ChatSummary = {
  eventId: string;
  title: string;
  siteName: string;
  siteSlug: string;
  coverImageUrl: string | null;
  startsAt: Date;
  closed: boolean;
  lastMessageAt: Date | null;
  messageCount: number;
};

/// Every chat this account belongs to, by the same rule the chat itself uses:
/// a live booking, or a seat on the site team. Platform admins are not given
/// the whole platform here, only their own rooms; they reach any other chat
/// from the site they are reviewing.
export async function listMyChats(userId: string): Promise<ChatSummary[]> {
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { bookings: { some: { userId, status: { not: "CANCELLED" } } } },
        { site: { members: { some: { userId } } } },
      ],
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      coverImageUrl: true,
      site: { select: { name: true, slug: true, coverImageUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      _count: { select: { messages: true } },
    },
  });

  return events
    .map((event) => ({
      eventId: event.id,
      title: event.title,
      siteName: event.site.name,
      siteSlug: event.site.slug,
      coverImageUrl: event.coverImageUrl ?? event.site.coverImageUrl,
      startsAt: event.startsAt,
      closed: Date.now() > chatClosesAt(event).getTime(),
      lastMessageAt: event.messages[0]?.createdAt ?? null,
      messageCount: event._count.messages,
    }))
    // Rooms with conversation come first, most recent at the top: the one
    // someone last spoke in is the one they are looking for. Quiet rooms follow
    // by how soon the event runs. Comparing the two directly would put every
    // silent room above every active one, because an event start lies in the
    // future while a last message lies in the past.
    .sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
      }

      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;

      return a.startsAt.getTime() - b.startsAt.getTime();
    });
}
