"use client";

import { useState, type FormEvent } from "react";
import type { FunnelCounts, FunnelSummary } from "@/modules/analytics";

type FunnelResponse = {
  funnel?: FunnelSummary;
  error?: { message: string };
};

const LABELS: Array<{ key: keyof FunnelCounts; label: string }> = [
  { key: "qr_scan", label: "QR scans" },
  { key: "session_started", label: "Sessions started" },
  { key: "feedback_completed", label: "Feedback completed" },
  { key: "draft_generated", label: "Drafts generated" },
  { key: "draft_copied", label: "Drafts copied" },
  { key: "google_continue_clicked", label: "Continue to Google clicks" },
];

export function AnalyticsFunnel({
  businessId,
  initial,
}: {
  businessId: string;
  initial: FunnelSummary;
}) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [counts, setCounts] = useState<FunnelCounts>(initial.counts);
  const [totalEvents, setTotalEvents] = useState(initial.totalEvents);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      const response = await fetch(
        `/api/v1/businesses/${businessId}/analytics?${params.toString()}`,
      );
      const body = (await response.json()) as FunnelResponse;
      if (!response.ok || !body.funnel) {
        throw new Error(body.error?.message ?? "Failed to load analytics");
      }
      setCounts(body.funnel.counts);
      setTotalEvents(body.funnel.totalEvents);
      setFrom(body.funnel.from);
      setTo(body.funnel.to);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-end gap-3"
        aria-label="Date range filter"
      >
        <label className="flex flex-col gap-1 text-sm">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Loading…" : "Apply"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {totalEvents === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No events in this range yet. Share a QR, collect feedback, and funnel
          steps will appear here.
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Funnel counts">
          {LABELS.map(({ key, label }) => (
            <li
              key={key}
              className="flex items-baseline justify-between gap-4 border-b border-zinc-200 pb-2 dark:border-zinc-800"
            >
              <span className="text-sm">{label}</span>
              <span className="text-lg font-semibold tabular-nums">
                {counts[key]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
