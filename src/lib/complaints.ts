/// Plain values shared by the complaint form and the server that validates it.
/// Kept apart from `server/complaints.ts` so the browser bundle does not pull
/// Prisma in.

export const COMPLAINT_REASONS = [
  "CONDUCT",
  "SAFETY",
  "MONEY",
  "NO_SHOW",
  "OTHER",
] as const;

export type ComplaintReason = (typeof COMPLAINT_REASONS)[number];

export function isComplaintReason(value: unknown): value is ComplaintReason {
  return (
    typeof value === "string" &&
    (COMPLAINT_REASONS as readonly string[]).includes(value)
  );
}

/// Long enough that "bad" is not a complaint, short enough to stay readable.
export const MIN_COMPLAINT_LENGTH = 20;
export const MAX_COMPLAINT_LENGTH = 2000;

export const COMPLAINT_STATUSES = [
  "OPEN",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const COMPLAINT_OUTCOMES = ["NO_ACTION", "WARNED", "SUSPENDED"] as const;

export type ComplaintOutcome = (typeof COMPLAINT_OUTCOMES)[number];
