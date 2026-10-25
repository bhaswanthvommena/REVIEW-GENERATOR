import type { AnalyticsEventType } from "@/types/database";

export const FUNNEL_EVENT_TYPES = [
  "qr_scan",
  "session_started",
  "feedback_completed",
  "draft_generated",
  "draft_copied",
  "google_continue_clicked",
] as const satisfies readonly AnalyticsEventType[];

export type FunnelCounts = Record<(typeof FUNNEL_EVENT_TYPES)[number], number>;

export type FunnelSummary = {
  from: string;
  to: string;
  counts: FunnelCounts;
  totalEvents: number;
};

export function emptyFunnelCounts(): FunnelCounts {
  return {
    qr_scan: 0,
    session_started: 0,
    feedback_completed: 0,
    draft_generated: 0,
    draft_copied: 0,
    google_continue_clicked: 0,
  };
}

export function aggregateFunnelCounts(
  rows: Array<{ event_type: string }>,
): FunnelCounts {
  const counts = emptyFunnelCounts();
  for (const row of rows) {
    const key = row.event_type as keyof FunnelCounts;
    if (key in counts) {
      counts[key] += 1;
    }
  }
  return counts;
}

/** Parse inclusive date range (YYYY-MM-DD). Defaults to last 30 days UTC. */
export function resolveAnalyticsDateRange(input: {
  from?: string | null;
  to?: string | null;
}): { from: string; to: string; fromIso: string; toIsoExclusive: string } {
  const today = new Date();
  const toDate = input.to ? parseDateOnly(input.to) : startOfUtcDay(today);
  const fromDate = input.from
    ? parseDateOnly(input.from)
    : new Date(toDate.getTime() - 29 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("INVALID_DATE_RANGE");
  }
  if (fromDate.getTime() > toDate.getTime()) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const toExclusive = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);

  return {
    from: formatDateOnly(fromDate),
    to: formatDateOnly(toDate),
    fromIso: fromDate.toISOString(),
    toIsoExclusive: toExclusive.toISOString(),
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(Number.NaN);
  }
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
