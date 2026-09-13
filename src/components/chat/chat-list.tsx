import { getFormatter, getTranslations } from "next-intl/server";

import { CoverImage } from "@/components/cover-image";
import { Link } from "@/i18n/navigation";
import type { ChatSummary } from "@/server/chat";

/// Every room the reader belongs to, so switching between them does not mean
/// walking back out through the event pages.
export async function ChatList({
  chats,
  activeEventId,
}: {
  chats: ChatSummary[];
  activeEventId: string;
}) {
  const t = await getTranslations("Chat");
  const format = await getFormatter();

  return (
    <aside className="space-y-2">
      <h2 className="section-title text-sm">{t("yourChats")}</h2>

      {/* A column beside the conversation on wide screens; a strip that scrolls
          sideways on a phone, where a tall list would push the chat off. */}
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {chats.map((chat) => {
          const active = chat.eventId === activeEventId;

          return (
            <li key={chat.eventId} className="shrink-0 lg:shrink">
              <Link
                href={`/sites/${chat.siteSlug}/events/${chat.eventId}/chat`}
                aria-current={active ? "page" : undefined}
                className={`flex w-56 items-center gap-2.5 rounded-xl border p-2 transition lg:w-auto ${
                  active
                    ? "border-accent-border bg-accent-soft"
                    : "border-line bg-surface hover:border-accent-border"
                }`}
              >
                <CoverImage
                  src={chat.coverImageUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg border border-line"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{chat.title}</p>
                  <p className="truncate text-xs text-muted">{chat.siteName}</p>
                </div>

                <div className="shrink-0 text-right">
                  {chat.lastMessageAt ? (
                    <p className="text-[0.65rem] text-faint">
                      {format.dateTime(chat.lastMessageAt, {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  ) : null}
                  {chat.closed ? (
                    <span className="badge mt-0.5 px-1.5 py-0 text-[0.6rem]">
                      {t("closedShort")}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
