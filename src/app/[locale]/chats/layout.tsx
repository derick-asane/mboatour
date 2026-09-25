import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import {
  ConversationList,
  type ConversationRow,
} from "@/components/chat/conversation-list";
import { listConversations } from "@/server/chat-inbox";
import { requireUser } from "@/server/session";

/// The inbox frame: every conversation on the left, the open one beside it. The
/// list lives in the layout so it is fetched once and stays put while the
/// conversation next to it changes.
export default async function ChatsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser();

  const t = await getTranslations("Chat");
  const format = await getFormatter();

  const conversations = await listConversations(user.id);

  // Dates are formatted here rather than in the client component, so the list
  // ships as plain strings.
  const rows: ConversationRow[] = conversations.map((conversation) => ({
    kind: conversation.kind,
    id: conversation.id,
    href: conversation.href,
    title: conversation.title,
    subtitle: conversation.subtitle,
    counterpart: conversation.counterpart,
    imageUrl: conversation.imageUrl,
    closed: conversation.closed,
    dateLabel: conversation.lastMessageAt
      ? format.dateTime(conversation.lastMessageAt, {
          day: "numeric",
          month: "short",
        })
      : null,
  }));

  // The frame is the viewport, not the content: only the message list scrolls,
  // so the composer never leaves the screen. The negative margin cancels the
  // padding the app layout puts around a page.
  return (
    <div className="flex flex-col gap-4 lg:-my-10 lg:h-[calc(100dvh-3.5rem)] lg:py-6">
      <div className="shrink-0">
        <p className="eyebrow">{t("inboxEyebrow")}</p>
        <h1 className="page-title">{t("inboxTitle")}</h1>
      </div>

      {/* With nothing to list, the empty state gets the whole width rather than
          sitting beside an empty column. */}
      <div
        className={`grid min-h-0 gap-5 lg:flex-1 ${
          rows.length > 0 ? "lg:grid-cols-[16rem_minmax(0,1fr)]" : ""
        }`}
      >
        {rows.length > 0 ? (
          <div className="min-h-0 lg:overflow-y-auto">
            <ConversationList rows={rows} />
          </div>
        ) : null}

        <div className="flex min-h-0 flex-col">{children}</div>
      </div>
    </div>
  );
}
