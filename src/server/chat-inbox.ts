import { prisma } from "@/lib/prisma";
import { chatClosesAt } from "@/server/chat";
import { guideChatClosesAt } from "@/server/guide-chat";

/// One inbox over both kinds of room. An event chat and a conversation with a
/// guide are different things underneath — one is a group derived from
/// bookings and site membership, the other a private pair — but to the person
/// reading them they are both just conversations, so they are listed together
/// and opened the same way.

export type ConversationKind = "event" | "guide";

export type Conversation = {
  kind: ConversationKind;
  /// The event or the guide booking, depending on the kind.
  id: string;
  href: string;
  title: string;
  /// Literal text under the title: the site an event belongs to. Null for a
  /// conversation with a guide, where the line is a translated role instead.
  subtitle: string | null;
  /// Which side the other person is on, for a conversation with a guide.
  counterpart: "traveller" | "guide" | null;
  /// Null for a conversation with no picture to show, where the list falls back
  /// to an initial.
  imageUrl: string | null;
  closed: boolean;
  lastMessageAt: Date | null;
  /// When the outing itself happens, used to order rooms nobody has written in
  /// yet.
  scheduledAt: Date;
  messageCount: number;
};

function displayName(user: { name: string | null; email: string }): string {
  return user.name ?? user.email.split("@")[0];
}

/// Every event chat this account belongs to, by the same rule the chat itself
/// uses: a live booking, or a seat on the site team.
async function listEventConversations(userId: string): Promise<Conversation[]> {
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
      site: { select: { name: true, coverImageUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      _count: { select: { messages: true } },
    },
  });

  return events.map((event) => ({
    kind: "event" as const,
    id: event.id,
    href: `/chats/events/${event.id}`,
    title: event.title,
    subtitle: event.site.name,
    counterpart: null,
    imageUrl: event.coverImageUrl ?? event.site.coverImageUrl,
    closed: Date.now() > chatClosesAt(event).getTime(),
    lastMessageAt: event.messages[0]?.createdAt ?? null,
    scheduledAt: event.startsAt,
    messageCount: event._count.messages,
  }));
}

/// Conversations with a guide, from either side. A request still waiting for an
/// answer has no conversation yet, and one that was declined or called off only
/// stays in the list while there is something written in it to read back.
async function listGuideConversations(userId: string): Promise<Conversation[]> {
  const bookings = await prisma.guideBooking.findMany({
    where: {
      status: { not: "PENDING" },
      OR: [{ userId }, { guide: { userId } }],
    },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      userId: true,
      user: { select: { name: true, email: true } },
      guide: {
        select: {
          userId: true,
          photoUrl: true,
          user: { select: { name: true, email: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      _count: { select: { messages: true } },
    },
  });

  return bookings
    .filter((booking) => {
      const settled =
        booking.status === "DECLINED" || booking.status === "CANCELLED";

      return !settled || booking._count.messages > 0;
    })
    .map((booking) => {
      const isGuide = booking.guide.userId === userId;
      const settled =
        booking.status === "DECLINED" || booking.status === "CANCELLED";

      return {
        kind: "guide" as const,
        id: booking.id,
        href: `/chats/guides/${booking.id}`,
        // The other person's name is what identifies a one-to-one conversation.
        title: isGuide
          ? displayName(booking.user)
          : displayName(booking.guide.user),
        subtitle: null,
        counterpart: isGuide ? ("traveller" as const) : ("guide" as const),
        // Guides have a profile photo; travellers do not, so the guide's side
        // of the list falls back to an initial.
        imageUrl: isGuide ? null : booking.guide.photoUrl,
        closed: settled || Date.now() > guideChatClosesAt(booking).getTime(),
        lastMessageAt: booking.messages[0]?.createdAt ?? null,
        scheduledAt: booking.startDate,
        messageCount: booking._count.messages,
      };
    });
}

/// Both kinds in one list. Rooms with conversation come first, most recent at
/// the top: the one someone last spoke in is the one they are looking for.
/// Quiet rooms follow by how soon the outing is. Comparing the two dates
/// directly would put every silent room above every active one, because an
/// event start lies in the future while a last message lies in the past.
export async function listConversations(
  userId: string,
): Promise<Conversation[]> {
  const [events, guides] = await Promise.all([
    listEventConversations(userId),
    listGuideConversations(userId),
  ]);

  return [...events, ...guides].sort((a, b) => {
    if (a.lastMessageAt && b.lastMessageAt) {
      return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    }

    if (a.lastMessageAt) return -1;
    if (b.lastMessageAt) return 1;

    return a.scheduledAt.getTime() - b.scheduledAt.getTime();
  });
}
