import { describe, expect, it } from "vitest";
import { pickStyleBrief, shuffle, type Rng } from "./style";

/** Small deterministic generator (mulberry32) so tests are repeatable. */
function seeded(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LABELS = ["Car make and model", "Accessories installed", "Comment"];

describe("pickStyleBrief", () => {
  it("produces many different briefs across 100 customers", () => {
    const rng = seeded(42);
    const keys = new Set<string>();
    const tones = new Set<string>();
    const leads = new Set<string | null>();
    for (let i = 0; i < 100; i++) {
      const brief = pickStyleBrief(LABELS, rng);
      keys.add(JSON.stringify(brief));
      tones.add(brief.tone);
      leads.add(brief.leadWith);
    }
    expect(keys.size).toBeGreaterThan(40);
    expect(tones.size).toBeGreaterThanOrEqual(5);
    expect(leads.size).toBe(LABELS.length);
  });

  it("keeps drafts short when the customer gave no details", () => {
    const rng = seeded(7);
    for (let i = 0; i < 50; i++) {
      const brief = pickStyleBrief([], rng);
      expect(brief.maxWords).toBeLessThanOrEqual(60);
      expect(brief.leadWith).toBeNull();
    }
  });

  it("caps length at 90 words for a single detail", () => {
    const rng = seeded(9);
    for (let i = 0; i < 50; i++) {
      expect(pickStyleBrief(["Comment"], rng).maxWords).toBeLessThanOrEqual(90);
    }
  });

  it("is repeatable with the same seed", () => {
    expect(pickStyleBrief(LABELS, seeded(1))).toEqual(pickStyleBrief(LABELS, seeded(1)));
  });
});

describe("shuffle", () => {
  it("keeps every item and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seeded(3));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
