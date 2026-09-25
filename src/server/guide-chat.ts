import { CHAT_GRACE_DAYS, MAX_MESSAGE_LENGTH } from "@/lib/chat-limits";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type SessionUser } from "@/server/session";

/// The conversation belongs to the two people in the arrangement. Unlike an
/// event chat, no site team and no platform admin joins: a private plan between
/// a traveller and their guide is not a room anyone moderates.

export { MAX_MESSAGE_LENGTH };

export type GuideChatAccess = {
  user: SessionUser;
  booking: {
    id: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
    amountCents: number;
    currency: string;
  };
  /// The other person, whoever the reader is.
  counterpart: { name: string; photoUrl: string | null };
  /// True when the reader is the guide rather than the traveller.
  isGuide: boolean;
  closed: boolean;
  canPost: boolean;
  siteNames: string[];
};

/// Exported so the inbox can mark a conversation closed without re-deriving
/// the grace period.
export function guideChatClosesAt(booking: {
  startDate: Date;
  endDate: Date | null;
}): Date {
  const ends = booking.endDate ?? booking.startDate;

  return new Date(ends.getTime() + CHAT_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

/// Null when this conversation is not the reader's to see, which callers turn
/// into a 404 rather than a locked door.
export async function loadGuideChatAccess(
  bookingId: string,
): Promise<GuideChatAccess | null> {
  const user = await getCurrentUser();

  if (!user) return null;

  const booking = await prisma.guideBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      amountCents: true,
      currency: true,
      userId: true,
      user: { select: { name: true, email: true, image: true } },
      guide: {
        select: {
          userId: true,
          photoUrl: true,
          user: { select: { name: true, email: true, image: true } },
        },
      },
      sites: { select: { site: { select: { name: true } } } },
    },
  });

  if (!booking) return null;

  const isTraveller = booking.userId === user.id;
  const isGuide = booking.guide.userId === user.id;

  if (!isTraveller && !isGuide) return null;

  // Nothing to arrange until the guide has said yes.
  if (booking.status === "PENDING") return null;

  const declined =
    booking.status === "DECLINED" || booking.status === "CANCELLED";
  const closed = declined || Date.now() > guideChatClosesAt(booking).getTime();

  const traveller = booking.user.name ?? booking.user.email.split("@")[0];
  const guide =
    booking.guide.user.name ?? booking.guide.user.email.split("@")[0];

  return {
    user,
    booking: {
      id: booking.id,
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      amountCents: booking.amountCents,
      currency: booking.currency,
    },
    counterpart: {
      name: isGuide ? traveller : guide,
      // A guide's portrait when there is one; either way an account picture
      // beats an initial.
      photoUrl: isGuide
        ? booking.user.image
        : (booking.guide.photoUrl ?? booking.guide.user.image),
    },
    isGuide,
    closed,
    canPost: !closed,
    siteNames: booking.sites.map((entry) => entry.site.name),
  };
}

export type GuideChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  /// The author's account picture, so a room shows faces rather than letters.
  authorImage: string | null;
  removed: boolean;
  edited: boolean;
  attachmentUrl: string | null;
};

export const MESSAGE_WINDOW = 100;

/// The recent slice, oldest first. Read whole on each poll so a removal reaches
/// the other person too.
export async function listGuideMessages(
  bookingId: string,
): Promise<GuideChatMessage[]> {
  const messages = await prisma.guideMessage.findMany({
    where: { guideBookingId: bookingId },
    orderBy: { createdAt: "desc" },
    take: MESSAGE_WINDOW,
    select: {
      id: true,
      body: true,
      createdAt: true,
      deletedAt: true,
      editedAt: true,
      attachmentUrl: true,
      userId: true,
      user: { select: { name: true, email: true, image: true } },
    },
  });

  return messages.reverse().map((message) => ({
    id: message.id,
    body: message.deletedAt ? "" : message.body,
    createdAt: message.createdAt.toISOString(),
    authorId: message.userId,
    authorName: message.user.name ?? message.user.email.split("@")[0],
    authorImage: message.user.image,
    removed: message.deletedAt !== null,
    edited: message.editedAt !== null,
    attachmentUrl: message.deletedAt ? null : message.attachmentUrl,
  }));
}
