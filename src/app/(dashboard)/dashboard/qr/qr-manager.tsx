"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type QrCodeRow = {
  id: string;
  label: string | null;
  is_active: boolean;
  public_token: string;
  publicUrl: string;
  created_at: string;
  revoked_at: string | null;
};

export function QrManager({ businessId }: { businessId: string }) {
  const [qrCodes, setQrCodes] = useState<QrCodeRow[]>([]);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/v1/businesses/${businessId}/qr-codes`);
    const body = (await response.json()) as {
      qrCodes?: QrCodeRow[];
      error?: { message: string };
    };
    if (!response.ok) {
      throw new Error(body.error?.message ?? "Failed to load QR codes");
    }
    setQrCodes(body.qrCodes ?? []);
  }, [businessId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/qr-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || null }),
      });
      const body = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Create failed");
      }
      setLabel("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  async function onDeactivate(qr: QrCodeRow) {
    setError(null);
    const response = await fetch(`/api/v1/qr-codes/${qr.id}/deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: { message: string } };
      setError(body.error?.message ?? "Deactivate failed");
      return;
    }
    await refresh();
  }

  async function onCopy(qr: QrCodeRow) {
    try {
      await navigator.clipboard.writeText(qr.publicUrl);
      setCopiedId(qr.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy the link. Select it and copy.");
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading QR codes…</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          Label (optional)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Front desk"
            className="min-h-12 rounded-xl border border-zinc-300 bg-transparent px-3 text-base dark:border-zinc-700"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-xl bg-zinc-900 px-4 text-base font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Creating…" : "Create QR"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}

      {qrCodes.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No QR codes yet. Create one to print or share.
        </p>
      ) : (
        <ul className="space-y-4">
          {qrCodes.map((qr) => (
            <li
              key={qr.id}
              className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-start gap-4">
                {qr.is_active ? (
                  <Image
                    src={`/api/v1/qr-codes/${qr.id}/download?businessId=${businessId}&format=png`}
                    alt={`QR code${qr.label ? ` for ${qr.label}` : ""}`}
                    width={128}
                    height={128}
                    unoptimized
                    className="h-32 w-32 shrink-0 rounded-lg bg-white"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="font-medium">
                    {qr.label ?? "Untitled QR"}
                    {!qr.is_active ? (
                      <span className="ml-2 text-sm font-normal text-zinc-500">
                        inactive
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 break-all text-sm text-zinc-500">
                    {qr.publicUrl}
                  </p>
                </div>
              </div>
              {qr.is_active ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void onCopy(qr)}
                    className="min-h-12 rounded-xl bg-zinc-900 px-4 text-base font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {copiedId === qr.id ? "Link copied" : "Copy link"}
                  </button>
                  <a
                    href={qr.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 px-4 text-base font-medium dark:border-zinc-700"
                  >
                    Preview
                  </a>
                  <div className="flex gap-4 px-1 text-sm">
                    <a
                      className="underline"
                      href={`/api/v1/qr-codes/${qr.id}/download?businessId=${businessId}&format=png`}
                    >
                      Download PNG
                    </a>
                    <a
                      className="underline"
                      href={`/api/v1/qr-codes/${qr.id}/download?businessId=${businessId}&format=svg`}
                    >
                      SVG
                    </a>
                  </div>
                  <button
                    type="button"
                    className="self-start px-1 text-sm text-zinc-500 underline"
                    onClick={() => onDeactivate(qr)}
                  >
                    Deactivate
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
