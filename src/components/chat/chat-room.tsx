"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  editWindowOpen,
  MAX_MESSAGE_LENGTH,
  MESSAGE_EDIT_WINDOW_MINUTES,
} from "@/lib/chat-limits";
import {
  deleteMessageAction,
  editMessageAction,
  postMessageAction,
} from "@/server/actions/chat";
import { initialActionState } from "@/server/action-state";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  removed: boolean;
  edited: boolean;
};

/// How often the room asks for new messages. Short enough to feel live, long
/// enough to cost one cheap indexed query per participant.
const POLL_MS = 4000;

function SendButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? <span aria-hidden className="spinner" /> : null}
      {label}
    </button>
  );
}

export function ChatRoom({
  eventId,
  currentUserId,
  isTeam,
  initialMessages,
  canPost,
  closed,
  muted,
}: {
  eventId: string;
  currentUserId: string;
  isTeam: boolean;
  initialMessages: Message[];
  canPost: boolean;
  closed: boolean;
  muted: boolean;
}) {
  const t = useTranslations("Chat");
  const format = useFormatter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Ticks while a message is being written, so the edit link disappears on its
  // own when the window runs out rather than at the next poll.
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pinnedToBottom = useRef(true);

  /// Re-reads the recent window rather than asking only for newer rows: a
  /// moderator removing an older message has to reach everyone too. Pauses
  /// while the tab is hidden, so a forgotten tab costs nothing.
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/messages`, {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = (await response.json()) as { messages: Message[] };
      setMessages(data.messages);
    } catch {
      // A dropped poll is not worth showing: the next one is seconds away.
    }
  }, [eventId]);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 30_000);

    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    function poll() {
      if (document.visibilityState === "visible") void refresh();
    }

    const timer = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [refresh]);

  /// Follows new messages only when the reader is already at the bottom, so it
  /// never yanks someone out of the history they are scrolling.
  useEffect(() => {
    const list = listRef.current;

    if (list && pinnedToBottom.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function submit(formData: FormData) {
    setError(null);
    const result = await postMessageAction(initialActionState, formData);

    if (result.error) {
      setError(result.error);
      return;
    }

    formRef.current?.reset();
    pinnedToBottom.current = true;
    await refresh();
  }

  /// The form element wants a void-returning action, and the removal should
  /// show up straight away rather than at the next poll.
  async function remove(formData: FormData) {
    const result = await deleteMessageAction(initialActionState, formData);

    if (result.error) setError(result.error);

    await refresh();
  }

  async function saveEdit(formData: FormData) {
    setError(null);
    const result = await editMessageAction(initialActionState, formData);

    if (result.error) {
      setError(result.error);
      return;
    }

    setEditingId(null);
    await refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div
        ref={listRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          pinnedToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-line surface-muted p-4"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          messages.map((message) => {
            const mine = message.authorId === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}
              >
                <span className="avatar mt-0.5 shrink-0">
                  {message.authorName.trim().charAt(0) || "?"}
                </span>

                <div className={`min-w-0 max-w-[80%] ${mine ? "text-right" : ""}`}>
                  <p className="text-xs text-muted">
                    <span className="font-medium text-foreground">
                      {mine ? t("you") : message.authorName}
                    </span>{" "}
                    {format.dateTime(new Date(message.createdAt), {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  {message.removed ? (
                    <p className="mt-1 inline-block rounded-xl border border-dashed border-line-strong px-3 py-2 text-sm italic text-faint">
                      {t("removed")}
                    </p>
                  ) : editingId === message.id ? (
                    <form action={saveEdit} className="mt-1 space-y-2 text-left">
                      <input type="hidden" name="messageId" value={message.id} />
                      <input
                        className="input"
                        name="body"
                        defaultValue={message.body}
                        maxLength={MAX_MESSAGE_LENGTH}
                        autoFocus
                        required
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary btn-sm">
                          {t("save")}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => setEditingId(null)}
                        >
                          {t("cancelEdit")}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      className={`mt-1 inline-block whitespace-pre-wrap break-words rounded-xl border px-3 py-2 text-left text-sm ${
                        mine
                          ? "border-accent-border bg-accent-soft"
                          : "border-line bg-surface"
                      }`}
                    >
                      {message.body}
                      {message.edited ? (
                        <span className="ml-1.5 text-xs text-faint">
                          {t("editedMark")}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {!message.removed && editingId !== message.id ? (
                    <div className="mt-1 flex flex-wrap gap-3">
                      {/* Only the author, and only while the window is open. The
                          server checks the same thing; this just hides a button
                          that would fail. */}
                      {mine && editWindowOpen(new Date(message.createdAt), new Date(now)) ? (
                        <button
                          type="button"
                          className="text-xs text-faint hover:text-accent"
                          onClick={() => setEditingId(message.id)}
                        >
                          {t("edit")}
                        </button>
                      ) : null}

                      {mine || isTeam ? (
                        <form action={remove}>
                          <input type="hidden" name="messageId" value={message.id} />
                          <button
                            type="submit"
                            className="text-xs text-faint hover:text-danger"
                          >
                            {t("remove")}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {error ? (
        <p className="alert alert-error">
          {t(error, { minutes: MESSAGE_EDIT_WINDOW_MINUTES })}
        </p>
      ) : null}

      {canPost ? (
        <form ref={formRef} action={submit} className="flex items-end gap-2">
          <input type="hidden" name="eventId" value={eventId} />
          <label className="flex-1">
            <span className="sr-only">{t("placeholder")}</span>
            <input
              className="input"
              name="body"
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={t("placeholder")}
              autoComplete="off"
              required
            />
          </label>
          <SendButton label={t("send")} />
        </form>
      ) : (
        <p className="alert">{closed ? t("closed") : muted ? t("muted") : t("readOnly")}</p>
      )}
    </div>
  );
}
