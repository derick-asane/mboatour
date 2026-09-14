/// Plain values shared by the review UI and the server that validates it, kept
/// apart from `server/reviews.ts` so the browser bundle does not pull Prisma in.

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export const MAX_REVIEW_LENGTH = 2000;
