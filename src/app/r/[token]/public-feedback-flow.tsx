"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type Attribute = { id: string; label: string; displayOrder: number };

type ResolvePayload = {
  businessName: string;
  googleReviewUrl: string;
  attributes: Attribute[];
};

type Step = "loading" | "rate" | "draft" | "error";

export function PublicFeedbackFlow({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number | undefined>>({});
  const [comment, setComment] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftWarnings, setDraftWarnings] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

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

  const allRated = useMemo(
    () =>
      attributes.length > 0 &&
      attributes.every((attr) => {
        const value = ratings[attr.id];
        return typeof value === "number" && value >= 1 && value <= 5;
      }),
    [attributes, ratings],
  );

  function onSubmitFeedback() {
    if (!sessionId || !allRated) return;
    startTransition(async () => {
      setErrorMessage(null);
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
        setStep("draft");
      } catch (err) {
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
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Could not generate draft.",
        );
      }
    });
  }

  if (step === "loading") {
    return (
      <div className="space-y-3" aria-live="polite">
        <p className="text-sm text-zinc-500">Opening feedback…</p>
        <div className="h-2 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (step === "error") {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Link unavailable</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
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
          <h1 className="text-2xl font-semibold tracking-tight">Your review draft</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            AI writes a starting draft from your ratings
            {comment.trim() ? " and comment" : ""}. Edit anything that is not
            accurate before you post on Google.
          </p>
        </div>

        {!draftText ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onGenerateDraft(false)}
            className="w-full rounded bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
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
                className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                aria-live="polite"
              />
            </label>
            {draftWarnings.length > 0 ? (
              <ul className="list-disc pl-5 text-xs text-zinc-500">
                {draftWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={() => onGenerateDraft(true)}
              className="text-sm underline disabled:opacity-50"
            >
              {pending ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        )}

        {errorMessage ? (
          <p className="text-sm text-red-700 dark:text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <a
          href={googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded border border-zinc-300 px-4 py-3 text-sm font-medium dark:border-zinc-700"
        >
          Continue to Google
        </a>
        <p className="text-xs text-zinc-500">
          Continue to Google is always available — never hidden based on your
          scores or draft quality. We do not post for you.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{businessName}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          How was your visit? Rate each item — nothing is preselected. A short
          comment is optional.
        </p>
      </div>

      <div className="space-y-6">
        {attributes.map((attr) => (
          <fieldset key={attr.id} className="space-y-2">
            <legend className="text-sm font-medium">{attr.label}</legend>
            <div className="flex gap-2" role="radiogroup" aria-label={attr.label}>
              {[1, 2, 3, 4, 5].map((value) => {
                const selected = ratings[attr.id] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setRatings((prev) => ({ ...prev, [attr.id]: value }))
                    }
                    className={`h-11 w-11 rounded border text-sm font-medium transition-colors ${
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
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>

      {errorMessage ? (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!allRated || pending}
        onClick={onSubmitFeedback}
        className="w-full rounded bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Submitting…" : "Continue to draft"}
      </button>

      <p className="text-xs text-zinc-500">
        Ratings never block Continue to Google later. AI assists drafting only —
        you post on Google yourself.
      </p>
    </section>
  );
}
