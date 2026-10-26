"use client";

import { useState, type FormEvent } from "react";
import type { FunnelCounts, FunnelSummary } from "@/modules/analytics";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";

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

const PRESETS = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
] as const;

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeFor(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from: formatDate(from), to: formatDate(to) };
}

function ratio(part: number, whole: number) {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

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
  const [preset, setPreset] = useState<string>("30");

  async function load(nextFrom: string, nextTo: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: nextFrom, to: nextTo });
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

  function onPreset(days: number, id: string) {
    const range = rangeFor(days);
    setPreset(id);
    setFrom(range.from);
    setTo(range.to);
    void load(range.from, range.to);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPreset("custom");
    void load(from, to);
  }

  const max = Math.max(...LABELS.map(({ key }) => counts[key]), 1);
  const scans = counts.qr_scan;
  const clicks = counts.google_continue_clicked;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={preset === item.id ? "primary" : "outline"}
            onClick={() => onPreset(item.days, item.id)}
            disabled={loading}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3" aria-label="Custom date range">
        <Field label="From" htmlFor="analytics-from">
          <Input
            id="analytics-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label="To" htmlFor="analytics-to">
          <Input
            id="analytics-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="secondary" loading={loading}>
          Apply
        </Button>
      </form>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="QR scans" value={String(scans)} />
        <StatCard label="Continue clicks" value={String(clicks)} hint="Not published reviews" />
        <StatCard label="Click rate" value={ratio(clicks, scans)} hint="Continue clicks ÷ scans" />
      </div>

      {totalEvents === 0 ? (
        <EmptyState
          title="No events in this range"
          description="Share a QR and collect feedback. Scans, drafts, and Google clicks will show up here."
        />
      ) : (
        <ol className="space-y-4" aria-label="Funnel counts">
          {LABELS.map(({ key, label }, index) => {
            const previous = index === 0 ? null : counts[LABELS[index - 1]!.key];
            const width = `${Math.max(4, Math.round((counts[key] / max) * 100))}%`;
            return (
              <li key={key}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span>{label}</span>
                  <span className="font-semibold tabular-nums">{counts[key]}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand" style={{ width }} />
                </div>
                {previous !== null ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ratio(counts[key], previous)} of the previous step
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
