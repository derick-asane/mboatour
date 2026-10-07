/// Plain values and shapes shared by the question form, the action and the
/// model call. A `"use server"` file may only export async functions, and a
/// client component must not reach into anything that imports Prisma, so the
/// things all three need live here.

/// Long enough for a real question, short enough to keep a prompt cheap.
export const MAX_QUESTION_LENGTH = 500;

/// A listing the assistant chose, resolved against the catalogue so the link is
/// always real.
export type Recommendation = {
  slug: string;
  kind: string;
  name: string;
  summary: string | null;
  city: string | null;
  country: string | null;
  coverImageUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  href: string;
};

/// The assistant's own state: an answer and the listings it chose, which a
/// plain ActionState cannot carry.
export type AssistantState = {
  error?: string;
  question?: string;
  /// True when the question was spoken, so the page can show what was heard.
  spoken?: boolean;
  answer?: string;
  recommendations?: Recommendation[];
};

export const initialAssistantState: AssistantState = {};
