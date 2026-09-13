/// Plain values shared by the chat UI and the server that validates it. Kept
/// apart from `server/chat.ts` so the browser bundle does not pull Prisma in.

export const MAX_MESSAGE_LENGTH = 2000;

/// Posting stops this long after an event finishes; history stays readable.
export const CHAT_GRACE_DAYS = 7;
