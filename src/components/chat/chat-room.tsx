"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Avatar } from "@/components/avatar";
import {
  editWindowOpen,
  MAX_MESSAGE_LENGTH,
  MESSAGE_EDIT_WINDOW_MINUTES,
} from "@/lib/chat-limits";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/upload-limits";
import type { ActionState } from "@/server/action-state";
import { initialActionState } from "@/server/action-state";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  removed: boolean;
  edited: boolean;
  attachmentUrl: string | null;
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

type ChatAction = (
  previous: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export function ChatRoom({
  endpoint,
  hiddenFields,
  postAction,
  deleteAction,
  editAction,
  currentUserId,
  canModerate = false,
  initialMessages,
  canPost,
  closed,
  muted = false,
}: {
  /// Returns the recent window as JSON; the same access rules are re-checked
  /// there on every poll.
  endpoint: string;
  /// Sent with every message, naming what the conversation belongs to.
  hiddenFields: Record<string, string>;
  postAction: ChatAction;
  deleteAction: ChatAction;
  editAction: ChatAction;
  currentUserId: string;
  /// Someone who may remove other people's messages. False in a conversation of
  /// two, where there is nobody to moderate on behalf of.
  canModerate?: boolean;
  initialMessages: Message[];
  canPost: boolean;
  closed: boolean;
  muted?: boolean;
}) {
  const t = useTranslations("Chat");
  const format = useFormatter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [picture, setPicture] = useState<File | null>(null);
  const pictureRef = useRef<HTMLInputElement>(null);
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
      const response = await fetch(endpoint, { cache: "no-store" });

      if (!response.ok) return;

      const data = (await response.json()) as { messages: Message[] };
      setMessages(data.messages);
    } catch {
      // A dropped poll is not worth showing: the next one is seconds away.
    }
  }, [endpoint]);

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
    const result = await postAction(initialActionState, formData);

    if (result.error) {
      setError(result.error);
      return;
    }

    formRef.current?.reset();
    setPicture(null);
    pinnedToBottom.current = true;
    await refresh();
  }

  /// The form element wants a void-returning action, and the removal should
  /// show up straight away rather than at the next poll.
  async function remove(formData: FormData) {
    const result = await deleteAction(initialActionState, formData);

    if (result.error) setError(result.error);

    await refresh();
  }

  async function saveEdit(formData: FormData) {
    setError(null);
    const result = await editAction(initialActionState, formData);

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
                <Avatar
                  name={message.authorName}
                  imageUrl={message.authorImage}
                  className="mt-0.5 shrink-0"
                />

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
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setEditingId(null);
                        }}
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
                      {message.attachmentUrl ? (
                        <a
                          href={message.attachmentUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mb-1.5 block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={message.attachmentUrl}
                            alt=""
                            loading="lazy"
                            className="media-placeholder max-h-56 w-full max-w-64 rounded-lg border border-line object-cover"
                          />
                        </a>
                      ) : null}
                      {message.body}
                      {message.edited ? (
                        <span className="ml-1.5 text-xs text-faint">
                          {t("editedMark")}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {!message.removed && editingId !== message.id ? (
                    <div
                      className={`mt-1 flex flex-wrap items-center gap-3 ${
                        mine ? "justify-end" : ""
                      }`}
                    >
                      {/* Only the author, and only while the window is open. The
                          server checks the same thing; this just hides a button
                          that would fail. */}
                      {mine && editWindowOpen(new Date(message.createdAt), new Date(now)) ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-muted underline decoration-dotted underline-offset-2 hover:text-accent"
                          onClick={() => setEditingId(message.id)}
                          title={t("editWindowHint", {
                            minutes: MESSAGE_EDIT_WINDOW_MINUTES,
                          })}
                        >
                          {t("edit")}
                        </button>
                      ) : null}

                      {mine || canModerate ? (
                        <form action={remove}>
                          <input type="hidden" name="messageId" value={message.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-muted underline decoration-dotted underline-offset-2 hover:text-danger"
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
        <form ref={formRef} action={submit} className="space-y-2">
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          {picture ? (
            <p className="flex items-center gap-2 text-xs text-muted">
              <span className="truncate">{picture.name}</span>
              <button
                type="button"
                className="text-faint hover:text-danger"
                onClick={() => {
                  setPicture(null);
                  if (pictureRef.current) pictureRef.current.value = "";
                }}
              >
                {t("removeAttachment")}
              </button>
            </p>
          ) : null}

          <div className="flex items-stretch gap-2">
            <input
              ref={pictureRef}
              type="file"
              name="attachment"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="sr-only"
              onChange={(event) => setPicture(event.target.files?.[0] ?? null)}
            />

            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={() => pictureRef.current?.click()}
              aria-label={t("attach")}
              title={t("attach")}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.5 3.5 0 1 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5" />
              </svg>
            </button>

            <label className="flex-1">
              <span className="sr-only">{t("placeholder")}</span>
              <input
                className="input"
                name="body"
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={t("placeholder")}
                autoComplete="off"
              />
            </label>

            <SendButton label={t("send")} />
          </div>
        </form>
      ) : (
        <p className="alert">{closed ? t("closed") : muted ? t("muted") : t("readOnly")}</p>
      )}
    </div>
  );
}
