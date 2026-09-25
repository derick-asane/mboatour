"use client";

import { useTranslations } from "next-intl";

import { Avatar } from "@/components/avatar";
import { CoverImage } from "@/components/cover-image";
import { Link, usePathname } from "@/i18n/navigation";

/// The rows are built on the server, where the dates are formatted, so this
/// component only has to decide which one is open. It reads that from the URL
/// rather than a prop so the layout can render the list once and keep it while
/// the conversation beside it changes.
export type ConversationRow = {
  kind: "event" | "guide";
  id: string;
  href: string;
  title: string;
  subtitle: string | null;
  counterpart: "traveller" | "guide" | null;
  imageUrl: string | null;
  closed: boolean;
  dateLabel: string | null;
};

export function ConversationList({ rows }: { rows: ConversationRow[] }) {
  const t = useTranslations("Chat");
  const pathname = usePathname();

  // The page heading already says what this is, so the list carries its name as
  // a label for screen readers rather than a second visible heading.
  return (
    <nav aria-label={t("yourChats")}>
      {/* A column beside the conversation on wide screens; a strip that scrolls
          sideways on a phone, where a tall list would push the chat off. */}
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {rows.map((row) => {
          const active = pathname === row.href;

          return (
            <li key={`${row.kind}-${row.id}`} className="shrink-0 lg:shrink">
              <Link
                href={row.href}
                aria-current={active ? "page" : undefined}
                className={`flex w-56 items-center gap-2.5 rounded-xl border p-2 transition lg:w-auto ${
                  active
                    ? "border-accent-border bg-accent-soft"
                    : "border-line bg-surface hover:border-accent-border"
                }`}
              >
                {/* An event is a place, so it keeps its square cover; a person
                    gets a round portrait, which is also how the rest of the app
                    tells the two apart. */}
                {row.kind === "guide" ? (
                  <Avatar
                    name={row.title}
                    imageUrl={row.imageUrl}
                    className="h-10 w-10 shrink-0 text-sm"
                  />
                ) : (
                  <CoverImage
                    src={row.imageUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg border border-line"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="truncate text-xs text-muted">
                    {row.counterpart === "guide"
                      ? t("roleGuide")
                      : row.counterpart === "traveller"
                        ? t("roleTraveller")
                        : row.subtitle}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  {row.dateLabel ? (
                    <p className="text-[0.65rem] text-faint">{row.dateLabel}</p>
                  ) : null}
                  {row.closed ? (
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
    </nav>
  );
}
