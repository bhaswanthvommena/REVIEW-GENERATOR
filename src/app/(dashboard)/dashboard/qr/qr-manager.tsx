"use client";

import { Copy, Download, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { toUserMessage, UserFacingError } from "@/lib/api/client";

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
  initial: QrCodeRow | null;
}) {
  const { push } = useToast();
  const [qr, setQr] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  async function onReplace() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/qr-codes`, {
        method: "POST",
      });
      const body = (await response.json()) as {
        qrCode?: QrCodeRow;
        error?: { message: string };
      };
      if (!response.ok || !body.qrCode) {
        throw new UserFacingError(body.error?.message ?? "Could not generate a QR code");
      }
      setQr(body.qrCode);
      push(qr ? "New QR code ready. The old one no longer works." : "QR code ready");
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function onCopy() {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr.publicUrl);
      setCopied(true);
      push("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the link. Select it and copy.");
    }
  }

  return (
    <div className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {qr ? (
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start">
            <div className="mx-auto w-full max-w-xs rounded-2xl border border-border bg-white p-5 text-center text-zinc-900 shadow-sm md:mx-0">
              <p className="text-sm font-semibold">{businessName}</p>
              <Image
                src={`/api/v1/qr-codes/${qr.id}/download?businessId=${businessId}&format=png`}
                alt={`QR code for ${businessName}`}
                width={180}
                height={180}
                unoptimized
                className="mx-auto mt-3 size-44 rounded-lg bg-white"
              />
              <p className="mt-3 text-xs font-medium tracking-wide uppercase">Scan to review</p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="break-all font-mono text-xs text-muted-foreground">{qr.publicUrl}</p>
              <Button type="button" onClick={() => void onCopy()}>
                <Copy className="size-4" aria-hidden="true" />
                {copied ? "Link copied" : "Copy link"}
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
                variant="outline"
                className="self-start"
                onClick={() => setConfirmReplace(true)}
              >
                Generate a new QR code
              </Button>
              <p className="text-sm text-muted-foreground">
                Use this if the current code does not work. The old code is replaced and stops opening the page.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No QR code yet"
          description="Saving your business details creates one. You can also generate it here."
          action={
            <Button type="button" onClick={() => void onReplace()} loading={pending}>
              Generate QR code
            </Button>
          }
        />
      )}

      <ConfirmDialog
        open={confirmReplace}
        title="Replace this QR code?"
        description="A new code is created and this one stops working. Anything already printed will no longer open the feedback page."
        confirmLabel="Generate new code"
        tone="primary"
        onClose={() => setConfirmReplace(false)}
        onConfirm={() => onReplace()}
      />
    </div>
  );
}
