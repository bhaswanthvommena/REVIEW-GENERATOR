import { z } from "zod";

export const PROMPT_VERSION = "review-draft/v2" as const;

export const DraftModelOutputSchema = z.object({
  draft_text: z.string().trim().min(1).max(4000),
  warnings: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
});

export type DraftModelOutput = z.infer<typeof DraftModelOutputSchema>;

export const DraftCreateSchema = z.object({
  feedbackSessionId: z.string().uuid(),
  regenerate: z.boolean().optional(),
});

export type DraftCreateInput = z.infer<typeof DraftCreateSchema>;

/** Gemini response JSON Schema (OpenAPI-ish) for structured outputs. */
export const DRAFT_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    draft_text: { type: "string" },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["draft_text"],
} as const;

const INCENTIVE_PATTERNS = [
  /\bdiscount\b/i,
  /\bfree\s+(meal|drink|item|gift)\b/i,
  /\bin\s+exchange\s+for\b/i,
  /\bcomp(ed|limentary)?\b/i,
  /\breview\s+for\s+a\b/i,
];

export function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function postValidateDraft(
  draftText: string,
  options?: { minWords?: number; maxWords?: number },
): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  const words = wordCount(draftText);
  const minWords = options?.minWords ?? 8;
  const maxWords = options?.maxWords ?? 220;

  if (words < minWords) {
    reasons.push(`Draft too short (${words} words)`);
  }
  if (words > maxWords) {
    reasons.push(`Draft too long (${words} words)`);
  }
  for (const pattern of INCENTIVE_PATTERNS) {
    if (pattern.test(draftText)) {
      reasons.push("Draft contains incentive-like phrasing");
      break;
    }
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

/** Heuristic: if comment has content words, at least one should appear in draft. */
export function faithfulnessHeuristic(
  comment: string | null | undefined,
  draftText: string,
): { ok: true } | { ok: false; reason: string } {
  if (!comment || comment.trim().length < 12) {
    return { ok: true };
  }

  // Do not require echoing prompt-injection / incentive payloads from comments.
  if (
    /ignore\s+previous\s+instructions|system\s+prompt|discount\s+code|FREE\d+/i.test(
      comment,
    )
  ) {
    return { ok: true };
  }

  const stop = new Set([
    "the",
    "and",
    "for",
    "was",
    "were",
    "with",
    "this",
    "that",
    "have",
    "had",
    "from",
    "they",
    "them",
    "very",
    "just",
    "about",
    "into",
    "our",
    "their",
  ]);

  const nouns = comment
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w));

  if (nouns.length === 0) {
    return { ok: true };
  }

  const draftLower = draftText.toLowerCase();
  const hit = nouns.some((n) => draftLower.includes(n));
  if (!hit) {
    return {
      ok: false,
      reason: "Draft may not reflect key words from the customer comment",
    };
  }
  return { ok: true };
}

const INJECTION_LIKE =
  /ignore\s+previous\s+instructions|system\s+prompt|discount\s+code|FREE\d+/i;

const DETAIL_STOP_WORDS = new Set([
  "the", "and", "for", "was", "were", "with", "this", "that", "have", "had",
  "from", "they", "them", "very", "just", "about", "into", "our", "their",
  "not", "are", "but", "you", "all", "any", "can", "has",
]);

function detailTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !DETAIL_STOP_WORDS.has(word));
}

/**
 * Check that the draft uses what the customer typed into the owner's fields.
 * Short answers (a car model, an item) need a matching word in at least half
 * of the cases. Long answers fall back to the comment heuristic.
 */
export function faithfulnessToDetails(
  details: Array<{ label: string; value: string }>,
  draftText: string,
): { ok: true } | { ok: false; reason: string } {
  const usable = details.filter(
    (detail) => detail.value.trim() !== "" && !INJECTION_LIKE.test(detail.value),
  );
  const draftLower = draftText.toLowerCase();

  const shortDetails = usable.filter((detail) => detail.value.length <= 80);
  const shortWithTokens = shortDetails.filter(
    (detail) => detailTokens(detail.value).length > 0,
  );
  if (shortWithTokens.length > 0) {
    const hits = shortWithTokens.filter((detail) =>
      detailTokens(detail.value).some((token) => draftLower.includes(token)),
    ).length;
    if (hits < Math.ceil(shortWithTokens.length / 2)) {
      return {
        ok: false,
        reason: "Draft may not mention the details the customer gave",
      };
    }
  }

  const longText = usable
    .filter((detail) => detail.value.length > 80)
    .map((detail) => detail.value)
    .join(" ");
  return longText ? faithfulnessHeuristic(longText, draftText) : { ok: true };
}
