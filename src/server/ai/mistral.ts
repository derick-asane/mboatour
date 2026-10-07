/// The one place that talks to Mistral. Everything about the model lives here,
/// so the rest of the app deals in questions and answers rather than HTTP.

const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";

/// Small models wander if left too long, and a traveller will not wait either.
const TIMEOUT_MS = 20_000;
const DEFAULT_MODEL = "ministral-8b-latest";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatResult =
  | { ok: true; content: string }
  | { ok: false; error: "assistantUnavailable" | "assistantFailed" };

/// Whether the key is present. Without it the feature says so plainly instead
/// of failing at the moment somebody asks a question.
export function isAssistantConfigured(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY);
}

export function assistantModel(): string {
  return process.env.MISTRAL_MODEL ?? DEFAULT_MODEL;
}

/// Asks the model, optionally insisting on a JSON object. Never throws: a model
/// that is down must not take a page with it.
export async function askModel(
  messages: ChatMessage[],
  { json = false }: { json?: boolean } = {},
): Promise<ChatResult> {
  const key = process.env.MISTRAL_API_KEY;

  if (!key) return { ok: false, error: "assistantUnavailable" };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: assistantModel(),
        messages,
        // Low, because this answers from a catalogue rather than inventing.
        temperature: 0.2,
        max_tokens: 700,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      // The body can carry the key back in an error echo, so only the status
      // is logged.
      console.error("[assistant] mistral replied", response.status);
      return { ok: false, error: "assistantFailed" };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) return { ok: false, error: "assistantFailed" };

    return { ok: true, content };
  } catch (error) {
    console.error("[assistant] call failed:", (error as Error).name);
    return { ok: false, error: "assistantFailed" };
  }
}
