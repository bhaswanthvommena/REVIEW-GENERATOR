"use client";

import { Copy, Download, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useCallback, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export type QrCodeRow = {
  id: string;
  label: string | null;
  is_active: boolean;
  publicUrl: string;
  created_at: string;
  revoked_at: string | null;
};

export function QrManager({
  businessId,
  businessName,
  initial,
}: {
  businessId: string;
  businessName: string;
  initial: QrCodeRow[];
}) {
  const { push } = useToast();
  const [qrCodes, setQrCodes] = useState(initial);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<QrCodeRow | null>(null);

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
      push("QR code created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  async function onDeactivate(qr: QrCodeRow) {
    const response = await fetch(`/api/v1/qr-codes/${qr.id}/deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: { message: string } };
      throw new Error(body.error?.message ?? "Deactivate failed");
    }
    await refresh();
    push("QR code turned off");
  }

  async function onCopy(qr: QrCodeRow) {
    try {
      await navigator.clipboard.writeText(qr.publicUrl);
      setCopiedId(qr.id);
      push("Link copied");
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy the link. Select it and copy.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Label" htmlFor="qr-label" hint="Optional. For example, front desk." className="flex-1">
          <Input
            id="qr-label"
            value={label}
            placeholder="Front desk"
            aria-describedby="qr-label-hint"
            onChange={(event) => setLabel(event.target.value)}
          />
        </Field>
        <Button type="submit" loading={pending} className="sm:w-auto">
          Create QR
        </Button>
      </form>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {qrCodes.length === 0 ? (
        <EmptyState
          title="No QR codes yet"
          description="Create one to print or share. Customers open it on their phone."
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {qrCodes.map((qr) => (
            <li key={qr.id}>
              <Card>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{qr.label ?? "Untitled QR"}</p>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {qr.publicUrl}
                      </p>
                    </div>
                    <Badge tone={qr.is_active ? "success" : "muted"}>
                      {qr.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {qr.is_active ? (
                    <div className="mx-auto w-full max-w-xs rounded-2xl border border-border bg-white p-5 text-center text-zinc-900 shadow-sm">
                      <p className="text-sm font-semibold">{businessName}</p>
                      <Image
                        src={`/api/v1/qr-codes/${qr.id}/download?businessId=${businessId}&format=png`}
                        alt={`QR code${qr.label ? ` for ${qr.label}` : ""}`}
                        width={180}
                        height={180}
                        unoptimized
                        className="mx-auto mt-3 size-44 rounded-lg bg-white"
                      />
                      <p className="mt-3 text-xs font-medium tracking-wide uppercase">
                        Scan to review
                      </p>
                    </div>
                  ) : null}

                  {qr.is_active ? (
                    <div className="flex flex-col gap-2">
                      <Button type="button" onClick={() => void onCopy(qr)}>
                        <Copy className="size-4" aria-hidden="true" />
                        {copiedId === qr.id ? "Link copied" : "Copy link"}
                      </Button>
                      <a
                        href={qr.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "secondary", size: "lg" })}
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Preview
                      </a>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <a
                          className="inline-flex min-h-11 items-center gap-1 font-medium underline-offset-4 hover:underline"
                          href={`/api/v1/qr-codes/${qr.id}/download?businessId=${businessId}&format=png`}
                        >
                          <Download className="size-4" aria-hidden="true" />
                          Download PNG
                        </a>
                        <a
                          className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
                          href={`/api/v1/qr-codes/${qr.id}/download?businessId=${businessId}&format=svg`}
                        >
                          Download SVG
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="self-start text-muted-foreground"
                        onClick={() => setPendingDeactivate(qr)}
                      >
                        Deactivate
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Turn off this QR?"
        description="The printed code will stop opening the feedback page. Create a new one if you need a replacement."
        confirmLabel="Deactivate"
        onClose={() => setPendingDeactivate(null)}
        onConfirm={async () => {
          if (!pendingDeactivate) return;
          try {
            await onDeactivate(pendingDeactivate);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Deactivate failed");
          }
        }}
      />
    </div>
  );
}
