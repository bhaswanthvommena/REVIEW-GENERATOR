"use client";

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

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading QR codes…</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm">
          Label (optional)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Front desk"
            className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
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
              className="space-y-2 border-b border-zinc-200 pb-4 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {qr.label ?? "Untitled QR"}
                    {!qr.is_active ? (
                      <span className="ml-2 text-sm font-normal text-zinc-500">
                        inactive
                      </span>
                    ) : null}
                  </p>
                  <p className="break-all text-xs text-zinc-500">{qr.publicUrl}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a
                    className="underline"
                    href={`/api/v1/qr-codes/${qr.id}/download?businessId=${businessId}&format=png`}
                  >
                    PNG
                  </a>
                  <a
                    className="underline"
                    href={`/api/v1/qr-codes/${qr.id}/download?businessId=${businessId}&format=svg`}
                  >
                    SVG
                  </a>
                  {qr.is_active ? (
                    <a
                      className="underline"
                      href={qr.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                    </a>
                  ) : null}
                  {qr.is_active ? (
                    <button
                      type="button"
                      className="underline text-red-700 dark:text-red-400"
                      onClick={() => onDeactivate(qr)}
                    >
                      Deactivate
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
