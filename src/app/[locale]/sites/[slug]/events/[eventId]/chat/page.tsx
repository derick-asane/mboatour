import { redirect } from "@/i18n/navigation";

/// Event chats used to live under the site. They now open in the inbox
/// alongside every other conversation, so this address only forwards: links
/// already sent out, and bookmarks, keep working.
export default async function EventChatRedirect({
  params,
}: {
  params: Promise<{ locale: string; slug: string; eventId: string }>;
}) {
  const { locale, eventId } = await params;

  redirect({ href: `/chats/events/${eventId}`, locale });
}
