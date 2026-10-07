"use server";

import { getLocale } from "next-intl/server";

import { MAX_QUESTION_LENGTH, type AssistantState } from "@/lib/assistant";
import { askAssistant } from "@/server/ai/assistant";
import { transcribeAudio } from "@/server/ai/mistral";
import { requireUser } from "@/server/session";

/// Every question costs a call to a paid API, so one account cannot sit on the
/// key. Per process rather than per deployment, which is enough to stop a
/// runaway page and honest about what it is: a real limit belongs in the
/// database or a gateway once this is behind a load balancer.
const WINDOW_MS = 5 * 60 * 1000;
const asked = new Map<string, number[]>();

function maxPerWindow(): number {
  const configured = Number(process.env.ASSISTANT_MAX_PER_WINDOW);

  return Number.isFinite(configured) && configured > 0 ? configured : 15;
}

function withinLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (asked.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);

  if (recent.length >= maxPerWindow()) {
    asked.set(userId, recent);
    return false;
  }

  recent.push(now);
  asked.set(userId, recent);

  return true;
}

export async function askAssistantAction(
  _previous: AssistantState,
  formData: FormData,
): Promise<AssistantState> {
  // Signed in only: an open endpoint onto a paid model is somebody else's bill.
  const user = await requireUser("/ask");

  // A spoken question and a typed one are the same question once it is words,
  // so only the way in differs.
  const audio = formData.get("audio");
  const spoken = audio instanceof File && audio.size > 0;

  // The limit covers speech too: transcription is a second paid call, so this
  // is checked before either of them.
  if (!withinLimit(user.id)) {
    return { error: "tooManyQuestions", question: spoken ? undefined : String(formData.get("question") ?? "") };
  }

  let question: string;

  if (spoken) {
    const heard = await transcribeAudio(audio);

    if (!heard.ok) return { error: heard.error };

    question = heard.text.trim().slice(0, MAX_QUESTION_LENGTH);
  } else {
    question = String(formData.get("question") ?? "")
      .trim()
      .slice(0, MAX_QUESTION_LENGTH);
  }

  if (question.length < 3) {
    return { error: spoken ? "heardNothing" : "questionTooShort", question };
  }

  const locale = await getLocale();
  const result = await askAssistant(question, locale);

  if (!result.ok) return { error: result.error, question };

  return {
    question,
    spoken,
    answer: result.value.answer,
    recommendations: result.value.recommendations,
  };
}
