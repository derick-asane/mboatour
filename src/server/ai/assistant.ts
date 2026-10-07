import { MAX_QUESTION_LENGTH, type Recommendation } from "@/lib/assistant";
import { prisma } from "@/lib/prisma";
import { placeHref } from "@/lib/places";
import { publicSiteWhere } from "@/lib/sites";
import { askModel, type ChatMessage } from "@/server/ai/mistral";

/// A travel assistant that can only recommend places that exist.
///
/// The model never produces a link. It is handed a catalogue of public
/// listings and asked which ones answer the question; the slugs it names are
/// then looked up again here, and anything it invented simply finds no match
/// and is dropped. So a recommendation on screen is always a real listing the
/// public may see — which is the whole reason this is worth shipping rather
/// than letting a model write URLs.

/// How many listings travel in one prompt. Small enough to stay cheap, large
/// enough to cover a catalogue this size whole.
const CATALOGUE_LIMIT = 60;

export { MAX_QUESTION_LENGTH, type Recommendation } from "@/lib/assistant";

export type AssistantAnswer = {
  answer: string;
  recommendations: Recommendation[];
};

type CatalogueRow = {
  slug: string;
  kind: string;
  name: string;
  summary: string | null;
  description: string | null;
  category: string | null;
  city: string | null;
  country: string | null;
  entryFeeCents: number;
  currency: string;
  ratingAverage: number | null;
  ratingCount: number;
  coverImageUrl: string | null;
};

/// Everything a stranger may see, both sites and services. Nothing unverified
/// is ever described to anyone, so the assistant cannot leak a listing the
/// platform has not vouched for.
async function loadCatalogue(question: string): Promise<CatalogueRow[]> {
  const select = {
    slug: true,
    kind: true,
    name: true,
    summary: true,
    description: true,
    category: true,
    city: true,
    country: true,
    entryFeeCents: true,
    currency: true,
    ratingAverage: true,
    ratingCount: true,
    coverImageUrl: true,
  } as const;

  const total = await prisma.touristicSite.count({ where: publicSiteWhere() });

  if (total <= CATALOGUE_LIMIT) {
    return prisma.touristicSite.findMany({
      where: publicSiteWhere(),
      orderBy: [{ ratingCount: "desc" }, { name: "asc" }],
      select,
    });
  }

  // Past that, the catalogue no longer fits in a prompt, so the question
  // narrows it first. Crude on purpose: proper retrieval is its own job, and
  // guessing at it here would hide how rough this is.
  const words = question
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 3)
    .slice(0, 6);

  const matched = words.length
    ? await prisma.touristicSite.findMany({
        where: {
          ...publicSiteWhere(),
          OR: words.flatMap((word) => [
            { name: { contains: word, mode: "insensitive" as const } },
            { city: { contains: word, mode: "insensitive" as const } },
            { country: { contains: word, mode: "insensitive" as const } },
            { category: { contains: word, mode: "insensitive" as const } },
            { summary: { contains: word, mode: "insensitive" as const } },
          ]),
        },
        orderBy: [{ ratingCount: "desc" }, { name: "asc" }],
        take: CATALOGUE_LIMIT,
        select,
      })
    : [];

  if (matched.length > 0) return matched;

  // Nothing matched the words, so fall back to the best known listings rather
  // than answering with an empty catalogue.
  return prisma.touristicSite.findMany({
    where: publicSiteWhere(),
    orderBy: [{ ratingCount: "desc" }, { ratingAverage: "desc" }],
    take: CATALOGUE_LIMIT,
    select,
  });
}

function describe(row: CatalogueRow, locale: string): string {
  const parts = [
    `slug: ${row.slug}`,
    `kind: ${row.kind}`,
    `name: ${row.name}`,
    [row.city, row.country].filter(Boolean).join(", ") || null,
    row.category ? `category: ${row.category}` : null,
    row.entryFeeCents > 0
      ? `price from ${(row.entryFeeCents / 100).toLocaleString(locale)} ${row.currency}`
      : "free to enter",
    row.ratingCount > 0 && row.ratingAverage !== null
      ? `rated ${row.ratingAverage.toFixed(1)} by ${row.ratingCount}`
      : null,
    // Enough to judge relevance without pasting whole descriptions in.
    (row.summary ?? row.description ?? "").slice(0, 220) || null,
  ].filter(Boolean);

  return `- ${parts.join(" | ")}`;
}

const SYSTEM_PROMPT = `You are the travel assistant for Mboatour, a guide to Cameroon.

You will be given a CATALOGUE of listings and a QUESTION from a traveller.

Rules:
- Recommend only listings from the CATALOGUE. Never invent a place, a slug, a
  price or a link.
- If nothing in the CATALOGUE fits, say so plainly and recommend nothing. Do
  not offer a place that does not answer the question.
- Answer in the same language as the QUESTION.
- Be brief: at most three short sentences. Do not list the slugs in your
  answer, and do not write URLs; the page shows the places you choose.
- Answer travel questions about Cameroon generally if asked, but only
  recommend listings from the CATALOGUE.

Reply with JSON only, of exactly this shape:
{"answer": "your reply", "slugs": ["slug-of-each-listing-you-recommend"]}`;

type ModelReply = { answer?: unknown; slugs?: unknown };

/// Pulls the reply out of whatever the model actually sent. JSON mode is asked
/// for, but a small model can still wrap it in prose, so the first object in
/// the text is tried too before giving up.
function parseReply(content: string): { answer: string; slugs: string[] } | null {
  const candidates = [content];
  const braced = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);

  if (braced.length > 1) candidates.push(braced);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as ModelReply;
      const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";

      if (!answer) continue;

      const slugs = Array.isArray(parsed.slugs)
        ? parsed.slugs.filter((slug): slug is string => typeof slug === "string")
        : [];

      return { answer, slugs };
    } catch {
      // Try the next shape.
    }
  }

  return null;
}

export type AssistantResult =
  | { ok: true; value: AssistantAnswer }
  | { ok: false; error: string };

export async function askAssistant(
  question: string,
  locale: string,
): Promise<AssistantResult> {
  const trimmed = question.trim();

  if (trimmed.length < 3) return { ok: false, error: "questionTooShort" };

  const catalogue = await loadCatalogue(trimmed);

  if (catalogue.length === 0) return { ok: false, error: "nothingToSearch" };

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `CATALOGUE:\n${catalogue
        .map((row) => describe(row, locale))
        .join("\n")}\n\nQUESTION: ${trimmed.slice(0, MAX_QUESTION_LENGTH)}`,
    },
  ];

  const reply = await askModel(messages, { json: true });

  if (!reply.ok) return { ok: false, error: reply.error };

  const parsed = parseReply(reply.content);

  if (!parsed) return { ok: false, error: "assistantFailed" };

  // The model only ever names slugs. They are resolved here, against the same
  // public-only rule, so a recommendation it invented finds nothing and
  // disappears rather than becoming a broken link.
  const known = new Map(catalogue.map((row) => [row.slug, row]));

  const recommendations: Recommendation[] = [];

  for (const slug of parsed.slugs) {
    const row = known.get(slug);

    if (!row) continue;
    if (recommendations.some((entry) => entry.slug === slug)) continue;

    recommendations.push({
      slug: row.slug,
      kind: row.kind,
      name: row.name,
      summary: row.summary,
      city: row.city,
      country: row.country,
      coverImageUrl: row.coverImageUrl,
      ratingAverage: row.ratingAverage,
      ratingCount: row.ratingCount,
      href: placeHref(row.kind, row.slug),
    });
  }

  return {
    ok: true,
    value: { answer: parsed.answer, recommendations: recommendations.slice(0, 6) },
  };
}
