/// Plain values shared by the chat UI and the server that validates it. Kept
/// apart from `server/chat.ts` so the browser bundle does not pull Prisma in.

export const MAX_MESSAGE_LENGTH = 2000;

/// Posting stops this long after an event finishes; history stays readable.
export const CHAT_GRACE_DAYS = 7;

/// How long an author may correct their own message. After this the wording
/// stands: people have read it, and quietly rewriting it later would let a
/// conversation be rewritten under them.
export const MESSAGE_EDIT_WINDOW_MINUTES = 15;

export function editWindowOpen(createdAt: Date, now: Date = new Date()): boolean {
  return (
    now.getTime() - createdAt.getTime() < MESSAGE_EDIT_WINDOW_MINUTES * 60_000
  );
}
