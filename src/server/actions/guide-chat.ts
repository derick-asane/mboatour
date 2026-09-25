"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { editWindowOpen, MAX_MESSAGE_LENGTH } from "@/lib/chat-limits";
import { prisma } from "@/lib/prisma";
import {
  deleteUploadedImage,
  isUploadedFile,
  saveUploadedImage,
} from "@/lib/uploads";
import { failure, type ActionState } from "@/server/action-state";
import { loadGuideChatAccess } from "@/server/guide-chat";

const messageSchema = z.object({
  bookingId: z.string().min(1),
  body: z.string().trim().max(MAX_MESSAGE_LENGTH),
});

export async function postGuideMessageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = messageSchema.safeParse({
    bookingId: formData.get("bookingId"),
    body: formData.get("body"),
  });

  if (!parsed.success) return failure("messageEmpty");

  const access = await loadGuideChatAccess(parsed.data.bookingId);

  if (!access) return failure("forbidden");
  if (access.closed) return failure("chatClosed");

  const picture = formData.get("attachment");
  let attachmentUrl: string | null = null;

  // Written only once the sender is known to be allowed to post, so a refused
  // message leaves no file behind.
  if (isUploadedFile(picture)) {
    const saved = await saveUploadedImage(picture, "chat");

    if ("error" in saved) return failure(saved.error);

    attachmentUrl = saved.url;
  }

  if (!parsed.data.body && !attachmentUrl) return failure("messageEmpty");

  await prisma.guideMessage.create({
    data: {
      guideBookingId: parsed.data.bookingId,
      userId: access.user.id,
      body: parsed.data.body,
      attachmentUrl,
    },
  });

  revalidatePath("/chats", "layout");

  return {};
}

/// Each person may remove what they wrote. Nobody removes the other's words:
/// there is no moderator in a conversation of two.
export async function deleteGuideMessageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const messageId = String(formData.get("messageId") ?? "");

  const message = await prisma.guideMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      userId: true,
      guideBookingId: true,
      deletedAt: true,
      attachmentUrl: true,
    },
  });

  if (!message) return failure("messageNotFound");

  const access = await loadGuideChatAccess(message.guideBookingId);

  if (!access) return failure("forbidden");
  if (message.userId !== access.user.id) return failure("notYourMessage");
  if (message.deletedAt) return {};

  await prisma.guideMessage.update({
    where: { id: message.id },
    data: { deletedAt: new Date(), deletedById: access.user.id },
  });

  // The row stays as a trace; the picture must stop being reachable, since
  // everything under the upload folder is served publicly.
  if (message.attachmentUrl) await deleteUploadedImage(message.attachmentUrl);

  revalidatePath("/chats", "layout");

  return { success: "messageRemoved" };
}

const editSchema = z.object({
  messageId: z.string().min(1),
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export async function editGuideMessageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = editSchema.safeParse({
    messageId: formData.get("messageId"),
    body: formData.get("body"),
  });

  if (!parsed.success) return failure("messageEmpty");

  const message = await prisma.guideMessage.findUnique({
    where: { id: parsed.data.messageId },
    select: {
      id: true,
      userId: true,
      guideBookingId: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  if (!message) return failure("messageNotFound");

  const access = await loadGuideChatAccess(message.guideBookingId);

  if (!access) return failure("forbidden");
  if (message.userId !== access.user.id) return failure("notYourMessage");
  if (message.deletedAt) return failure("messageNotFound");

  // Checked here, not in the browser: a page left open must not rewrite an old
  // message.
  if (!editWindowOpen(message.createdAt)) return failure("editWindowClosed");

  await prisma.guideMessage.update({
    where: { id: message.id },
    data: { body: parsed.data.body, editedAt: new Date() },
  });

  revalidatePath("/chats", "layout");

  return { success: "messageEdited" };
}
