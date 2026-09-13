"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { failure, type ActionState } from "@/server/action-state";
import { loadChatAccess, MAX_MESSAGE_LENGTH } from "@/server/chat";

const messageSchema = z.object({
  eventId: z.string().min(1),
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export async function postMessageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = messageSchema.safeParse({
    eventId: formData.get("eventId"),
    body: formData.get("body"),
  });

  if (!parsed.success) return failure("messageEmpty");

  const access = await loadChatAccess(parsed.data.eventId);

  if (!access) return failure("forbidden");
  if (access.closed) return failure("chatClosed");
  if (access.muted) return failure("chatMuted");

  await prisma.eventMessage.create({
    data: {
      eventId: parsed.data.eventId,
      userId: access.user.id,
      body: parsed.data.body,
    },
  });

  revalidatePath(`/sites/${access.event.siteSlug}/events/${access.event.id}/chat`);

  return {};
}

/// Authors may remove their own message; the site team may remove any. The row
/// stays behind so moderation can be accounted for.
export async function deleteMessageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const messageId = String(formData.get("messageId") ?? "");

  const message = await prisma.eventMessage.findUnique({
    where: { id: messageId },
    select: { id: true, userId: true, eventId: true, deletedAt: true },
  });

  if (!message) return failure("messageNotFound");

  const access = await loadChatAccess(message.eventId);

  if (!access) return failure("forbidden");

  const isAuthor = message.userId === access.user.id;

  if (!isAuthor && !access.isTeam) return failure("forbidden");
  if (message.deletedAt) return {};

  await prisma.eventMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date(), deletedById: access.user.id },
  });

  revalidatePath(`/sites/${access.event.siteSlug}/events/${access.event.id}/chat`);

  return { success: "messageRemoved" };
}

/// The site team silences a participant for this event, or lifts it again.
/// Reading continues either way; only posting stops.
export async function toggleMuteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const eventId = String(formData.get("eventId") ?? "");
  const targetId = String(formData.get("userId") ?? "");

  const access = await loadChatAccess(eventId);

  if (!access || !access.isTeam) return failure("forbidden");
  if (targetId === access.user.id) return failure("cannotMuteSelf");

  const existing = await prisma.eventChatMute.findUnique({
    where: { eventId_userId: { eventId, userId: targetId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.eventChatMute.delete({ where: { id: existing.id } });
  } else {
    await prisma.eventChatMute.create({
      data: { eventId, userId: targetId, mutedById: access.user.id },
    });
  }

  revalidatePath(`/sites/${access.event.siteSlug}/events/${eventId}/chat`);

  return { success: existing ? "participantUnmuted" : "participantMuted" };
}
