import { describe, expect, it } from "vitest";
import {
  aggregateFunnelCounts,
  emptyFunnelCounts,
  resolveAnalyticsDateRange,
} from "./funnel";

describe("aggregateFunnelCounts", () => {
  it("counts known funnel events and ignores unknowns", () => {
    const counts = aggregateFunnelCounts([
      { event_type: "qr_scan" },
      { event_type: "qr_scan" },
      { event_type: "draft_copied" },
      { event_type: "google_continue_clicked" },
      { event_type: "not_a_real_event" },
    ]);
    expect(counts.qr_scan).toBe(2);
    expect(counts.draft_copied).toBe(1);
    expect(counts.google_continue_clicked).toBe(1);
    expect(counts.session_started).toBe(0);
  });

  it("starts empty", () => {
    expect(emptyFunnelCounts().feedback_completed).toBe(0);
  });
});

describe("resolveAnalyticsDateRange", () => {
  it("accepts an inclusive from/to range", () => {
    const range = resolveAnalyticsDateRange({
      from: "2026-10-01",
      to: "2026-10-07",
    });
    expect(range.from).toBe("2026-10-01");
    expect(range.to).toBe("2026-10-07");
    expect(range.toIsoExclusive.startsWith("2026-10-08")).toBe(true);
  });

  it("rejects inverted ranges", () => {
    expect(() =>
      resolveAnalyticsDateRange({ from: "2026-10-10", to: "2026-10-01" }),
    ).toThrow("INVALID_DATE_RANGE");
  });
});
