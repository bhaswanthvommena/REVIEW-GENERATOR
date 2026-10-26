/** A random writing brief so drafts differ from one customer to the next. */
export type StyleBrief = {
  tone: string;
  opening: string;
  rhythm: string;
  minWords: number;
  maxWords: number;
  /** Label of a customer detail to build the draft around, when one exists. */
  leadWith: string | null;
};

export type Rng = () => number;

const TONES = [
  "casual and relaxed",
  "warm and appreciative",
  "brief and matter-of-fact",
  "upbeat and enthusiastic",
  "thoughtful and measured",
  "friendly, like telling a friend",
  "plain-spoken and practical",
] as const;

const OPENINGS = [
  "open with the specific item, vehicle, or product the customer mentioned",
  "open with how the service felt",
  "open with the result or outcome",
  "open with why the customer came in",
  "open with the overall verdict in one short line",
  "open with how the price compared to the quality",
  "open with the standout detail, then fill in around it",
] as const;

const RHYTHMS = [
  "mostly short sentences",
  "a mix of short and longer sentences",
  "two or three flowing sentences",
  "a few punchy sentences, one of them very short",
] as const;

const LENGTH_BANDS = [
  { minWords: 35, maxWords: 60 },
  { minWords: 60, maxWords: 90 },
  { minWords: 80, maxWords: 120 },
] as const;

function pick<T>(items: readonly T[], rng: Rng): T {
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index] as T;
}

/** Fisher-Yates shuffle that returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * Pick a brief. `detailLabels` are the customer-detail labels available. With
 * no details the draft stays short so the model has nothing to pad with.
 */
export function pickStyleBrief(
  detailLabels: string[],
  rng: Rng = Math.random,
): StyleBrief {
  const sparse = detailLabels.length === 0;
  // Fewer details means a shorter ceiling, so the model has nothing to pad with.
  const bands =
    detailLabels.length >= 2
      ? LENGTH_BANDS
      : detailLabels.length === 1
        ? LENGTH_BANDS.slice(0, 2)
        : LENGTH_BANDS.slice(0, 1);
  const band = pick(bands, rng);
  return {
    tone: pick(TONES, rng),
    opening: sparse
      ? "open with the overall verdict in one short line"
      : pick(OPENINGS, rng),
    rhythm: pick(RHYTHMS, rng),
    minWords: band.minWords,
    maxWords: band.maxWords,
    leadWith: sparse ? null : pick(detailLabels, rng),
  };
}
