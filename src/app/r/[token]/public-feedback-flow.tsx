"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

type Attribute = { id: string; label: string; displayOrder: number };

type ResolvePayload = {
  businessName: string;
  googleReviewUrl: string;
  attributes: Attribute[];
};

type Step = "loading" | "rate" | "draft" | "error";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100";

export function PublicFeedbackFlow({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number | undefined>>({});
  const [comment, setComment] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftWarnings, setDraftWarnings] = useState<string[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const draftStatusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const resolveRes = await fetch(`/api/v1/r/${encodeURIComponent(token)}`);
        const resolveBody = (await resolveRes.json()) as ResolvePayload & {
          error?: { code: string; message: string };
        };

        if (!resolveRes.ok) {
          throw new Error(
            resolveBody.error?.message ??
              (resolveRes.status === 410
                ? "This QR code is no longer active."
                : "We could not open this feedback link."),
          );
        }

        if (cancelled) return;

        setBusinessName(resolveBody.businessName);
        setGoogleReviewUrl(resolveBody.googleReviewUrl);
        setAttributes(resolveBody.attributes);
        setRatings(
          Object.fromEntries(
            resolveBody.attributes.map((attr) => [attr.id, undefined]),
          ),
        );

        const sessionRes = await fetch(
          `/api/v1/r/${encodeURIComponent(token)}/sessions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientMeta: { locale: navigator.language },
            }),
          },
        );
        const sessionBody = (await sessionRes.json()) as {
          sessionId?: string;
          error?: { message: string };
        };
        if (!sessionRes.ok || !sessionBody.sessionId) {
          throw new Error(
            sessionBody.error?.message ?? "Could not start a feedback session.",
          );
        }

        if (cancelled) return;
        setSessionId(sessionBody.sessionId);
        setStep("rate");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong.",
        );
        setStep("error");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (step === "rate" || step === "draft" || step === "error") {
      headingRef.current?.focus();
    }
  }, [step]);

  const allRated = useMemo(
    () =>
      attributes.length > 0 &&
      attributes.every((attr) => {
        const value = ratings[attr.id];
        return typeof value === "number" && value >= 1 && value <= 5;
      }),
    [attributes, ratings],
  );

  async function emitEvent(
    eventType: "draft_copied" | "google_continue_clicked",
    props?: Record<string, unknown>,
  ) {
    try {
      await fetch(`/api/v1/r/${encodeURIComponent(token)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          feedbackSessionId: sessionId ?? undefined,
          props,
        }),
        keepalive: true,
      });
    } catch {
      // Analytics should not block UX.
    }
  }

  function onSubmitFeedback() {
    if (!sessionId || !allRated) return;
    startTransition(async () => {
      setErrorMessage(null);
      setStatusMessage("Saving your ratings…");
      try {
        const response = await fetch(
          `/api/v1/r/${encodeURIComponent(token)}/feedback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              comment: comment.trim() || null,
              ratings: attributes.map((attr) => ({
                attributeId: attr.id,
                rating: ratings[attr.id],
              })),
            }),
          },
        );
        const body = (await response.json()) as {
          error?: { message: string };
          next?: { googleReviewUrl?: string };
        };
        if (!response.ok) {
          throw new Error(body.error?.message ?? "Could not submit feedback.");
        }
        if (body.next?.googleReviewUrl) {
          setGoogleReviewUrl(body.next.googleReviewUrl);
        }
        setStatusMessage(null);
        setStep("draft");
      } catch (err) {
        setStatusMessage(null);
        setErrorMessage(
          err instanceof Error ? err.message : "Could not submit feedback.",
        );
      }
    });
  }

  function onGenerateDraft(regenerate = false) {
    if (!sessionId) return;
    startTransition(async () => {
      setErrorMessage(null);
      setStatusMessage(regenerate ? "Regenerating draft…" : "Generating draft…");
      try {
        const response = await fetch(
          `/api/v1/r/${encodeURIComponent(token)}/drafts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              feedbackSessionId: sessionId,
              regenerate,
            }),
          },
        );
        const body = (await response.json()) as {
          draft?: { text: string; warnings?: string[] };
          googleReviewUrl?: string;
          error?: { message: string };
        };
        if (!response.ok) {
          throw new Error(body.error?.message ?? "Could not generate draft.");
        }
        setDraftText(body.draft?.text ?? "");
        setDraftWarnings(body.draft?.warnings ?? []);
        if (body.googleReviewUrl) {
          setGoogleReviewUrl(body.googleReviewUrl);
        }
        setStatusMessage("Draft ready. You can edit it before copying.");
        draftStatusRef.current?.focus();
      } catch (err) {
        setStatusMessage(null);
        setErrorMessage(
          err instanceof Error ? err.message : "Could not generate draft.",
        );
      }
    });
  }

  async function onCopyDraft() {
    if (!draftText.trim()) return;
    try {
      await navigator.clipboard.writeText(draftText);
      setCopyState("copied");
      setStatusMessage("Draft copied to clipboard.");
      await emitEvent("draft_copied", { length: draftText.length });
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
      setStatusMessage("Could not copy automatically. Select the text and copy.");
    }
  }

  function onContinueToGoogle() {
    void emitEvent("google_continue_clicked", {
      hadDraft: Boolean(draftText.trim()),
    });
  }

  const googleCta = (
    <a
      href={googleReviewUrl || "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onContinueToGoogle}
      className={`inline-flex min-h-12 w-full items-center justify-center rounded border border-zinc-300 px-4 py-3 text-base font-medium dark:border-zinc-700 ${focusRing}`}
    >
      Continue to Google
    </a>
  );

  if (step === "loading") {
    return (
      <div className="space-y-3" aria-live="polite" aria-busy="true">
        <p className="text-sm text-zinc-500">Opening feedback…</p>
        <div className="h-2 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (step === "error") {
    return (
      <section className="space-y-3">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight outline-none"
        >
          Link unavailable
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400" role="alert">
          {errorMessage ??
            "This QR code may be expired, revoked, or invalid. Ask the business for a new one."}
        </p>
      </section>
    );
  }

  if (step === "draft") {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm text-zinc-500">{businessName}</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight outline-none"
          >
            Your review draft
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            AI writes a starting draft from your ratings
            {comment.trim() ? " and comment" : ""}. Edit for accuracy, copy, then
            continue to Google. We never post for you.
          </p>
        </div>

        <p
          ref={draftStatusRef}
          tabIndex={-1}
          className="sr-only outline-none"
          aria-live="polite"
        >
          {statusMessage}
        </p>
        {statusMessage ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-hidden="true">
            {statusMessage}
          </p>
        ) : null}

        {!draftText ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onGenerateDraft(false)}
            className={`min-h-12 w-full rounded bg-zinc-900 px-4 py-3 text-base font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 ${focusRing}`}
          >
            {pending ? "Generating…" : "Generate draft"}
          </button>
        ) : (
          <div className="space-y-3">
            <label className="flex flex-col gap-2 text-sm">
              Draft (editable)
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={8}
                className={`min-h-40 rounded border border-zinc-300 bg-transparent px-3 py-3 text-base dark:border-zinc-700 ${focusRing}`}
              />
            </label>
            {draftWarnings.length > 0 ? (
              <ul className="list-disc pl-5 text-xs text-zinc-500">
                {draftWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={pending || !draftText.trim()}
                onClick={() => void onCopyDraft()}
                className={`min-h-12 flex-1 rounded bg-zinc-900 px-4 py-3 text-base font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 ${focusRing}`}
              >
                {copyState === "copied" ? "Copied" : "Copy draft"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => onGenerateDraft(true)}
                className={`min-h-12 flex-1 rounded border border-zinc-300 px-4 py-3 text-base font-medium dark:border-zinc-700 disabled:opacity-50 ${focusRing}`}
              >
                {pending ? "Regenerating…" : "Regenerate"}
              </button>
            </div>
          </div>
        )}

        {errorMessage ? (
          <p className="text-sm text-red-700 dark:text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {/* Always available — never gated by ratings or draft presence. */}
        {googleCta}
        <p className="text-xs text-zinc-500">
          Continue to Google stays available whether or not you generate or copy
          a draft. Ratings never hide this button.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight outline-none"
        >
          {businessName}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          How was your visit? Rate each item — nothing is preselected. A short
          comment is optional.
        </p>
      </div>

      <div className="space-y-6">
        {attributes.map((attr) => (
          <fieldset key={attr.id} className="space-y-2">
            <legend className="text-sm font-medium">{attr.label}</legend>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={attr.label}
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const selected = ratings[attr.id] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${attr.label}: ${value} out of 5`}
                    onClick={() =>
                      setRatings((prev) => ({ ...prev, [attr.id]: value }))
                    }
                    className={`h-12 w-12 rounded border text-base font-medium transition-colors ${focusRing} ${
                      selected
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 bg-transparent dark:border-zinc-700"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <label className="flex flex-col gap-2 text-sm">
        Anything else to share? (optional)
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="What stood out?"
          className={`rounded border border-zinc-300 bg-transparent px-3 py-3 text-base dark:border-zinc-700 ${focusRing}`}
        />
      </label>

      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!allRated || pending}
        onClick={onSubmitFeedback}
        className={`min-h-12 w-full rounded bg-zinc-900 px-4 py-3 text-base font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 ${focusRing}`}
      >
        {pending ? "Submitting…" : "Continue to draft"}
      </button>

      {/* Google path is never gated by the star ratings above. */}
      {googleReviewUrl ? googleCta : null}
      <p className="text-xs text-zinc-500">
        Continue to Google is available now and after drafting — never hidden
        based on your scores.
      </p>
    </section>
  );
}
