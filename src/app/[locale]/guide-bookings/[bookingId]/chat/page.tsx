import { redirect } from "@/i18n/navigation";

/// The conversation with a guide now opens in the inbox alongside every other
/// conversation, so this address only forwards: links already sent out, and
/// bookmarks, keep working.
export default async function GuideChatRedirect({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;

  redirect({ href: `/chats/guides/${bookingId}`, locale });
}
