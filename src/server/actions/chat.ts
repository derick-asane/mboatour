"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { failure, type ActionState } from "@/server/action-state";
import { editWindowOpen } from "@/lib/chat-limits";
import {
  deleteUploadedImage,
  isUploadedFile,
  saveUploadedImage,
} from "@/lib/uploads";
import { loadChatAccess, MAX_MESSAGE_LENGTH } from "@/server/chat";

const messageSchema = z.object({
  eventId: z.string().min(1),
  body: z.string().trim().max(MAX_MESSAGE_LENGTH),
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

  const picture = formData.get("attachment");
  let attachmentUrl: string | null = null;

  // Uploaded only once the sender is known to be allowed to post, so a refused
  // message never leaves a file behind.
  if (isUploadedFile(picture)) {
    const saved = await saveUploadedImage(picture, "chat");

    if ("error" in saved) return failure(saved.error);

    attachmentUrl = saved.url;
  }

  if (!parsed.data.body && !attachmentUrl) return failure("messageEmpty");

  await prisma.eventMessage.create({
    data: {
      eventId: parsed.data.eventId,
      userId: access.user.id,
      body: parsed.data.body,
      attachmentUrl,
    },
  });

  revalidatePath("/chats", "layout");

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
    select: {
      id: true,
      userId: true,
      eventId: true,
      deletedAt: true,
      attachmentUrl: true,
    },
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

  // The row stays for the audit trail, but the picture must stop being
  // reachable: everything under the upload folder is served publicly.
  if (message.attachmentUrl) await deleteUploadedImage(message.attachmentUrl);

  revalidatePath("/chats", "layout");

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

  revalidatePath("/chats", "layout");

  return { success: existing ? "participantUnmuted" : "participantMuted" };
}

const editSchema = z.object({
  messageId: z.string().min(1),
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

/// Corrects wording shortly after posting. Only the author may edit, and only
/// inside the window: a moderator who dislikes a message removes it rather than
/// putting different words in someone else's mouth.
export async function editMessageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = editSchema.safeParse({
    messageId: formData.get("messageId"),
    body: formData.get("body"),
  });

  if (!parsed.success) return failure("messageEmpty");

  const message = await prisma.eventMessage.findUnique({
    where: { id: parsed.data.messageId },
    select: { id: true, userId: true, eventId: true, createdAt: true, deletedAt: true },
  });

  if (!message) return failure("messageNotFound");

  const access = await loadChatAccess(message.eventId);

  if (!access) return failure("forbidden");
  if (message.userId !== access.user.id) return failure("notYourMessage");
  if (message.deletedAt) return failure("messageNotFound");

  // The clock is checked here, not in the browser: a stale page must not be
  // able to rewrite an old message.
  if (!editWindowOpen(message.createdAt)) return failure("editWindowClosed");

  await prisma.eventMessage.update({
    where: { id: message.id },
    data: { body: parsed.data.body, editedAt: new Date() },
  });

  revalidatePath("/chats", "layout");

  return { success: "messageEdited" };
}
