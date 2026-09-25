import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";
import { listConversations } from "@/server/chat-inbox";
import { requireUser } from "@/server/session";

/// What the inbox shows before a conversation is picked: either a nudge towards
/// the list on the left, or, for somebody with no conversations at all, how to
/// end up with one.
export default async function ChatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser();

  const t = await getTranslations("Chat");
  const conversations = await listConversations(user.id);

  if (conversations.length === 0) {
    return (
      <EmptyState
        title={t("inboxEmptyTitle")}
        description={t("inboxEmptyBody")}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/sites" className="btn-primary btn-sm">
              {t("inboxEmptyBrowse")}
            </Link>
            <Link href="/guides" className="btn-secondary btn-sm">
              {t("inboxEmptyGuides")}
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="card flex flex-1 items-center justify-center p-8 text-center">
      <p className="text-sm text-muted">{t("inboxPick")}</p>
    </div>
  );
}
