"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { toUserMessage, UserFacingError } from "@/lib/api/client";
import { DRAFT_LIMIT_MESSAGE, MAX_DRAFTS_PER_SESSION } from "@/modules/ai/limits";

type Attribute = { id: string; label: string; displayOrder: number };

type CustomField = {
  id: string;
  label: string;
  inputType: "short" | "long";
  isRequired: boolean;
  displayOrder: number;
  maxLength: number;
};

type ResolvePayload = {
  businessName: string;
  googleReviewUrl: string;
  attributes: Attribute[];
  fields?: CustomField[];
};

type Step = "loading" | "rate" | "draft" | "error";

const STAR_WORDS = ["Poor", "Fair", "Okay", "Good", "Great"] as const;

const FLOW_STEPS = [
  { id: "rate", label: "Rate" },
  { id: "draft", label: "Draft" },
  { id: "google", label: "Google" },
] as const;

function wordCount(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function StarRow({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <fieldset
      className="rounded-2xl border border-border bg-card p-4 shadow-card"
      onMouseLeave={() => setHover(null)}
    >
      <legend className="px-1 text-base font-medium">{label}</legend>
      <div className="mt-3 flex gap-1" role="presentation">
        {[1, 2, 3, 4, 5].map((star) => {
          const word = STAR_WORDS[star - 1];
          return (
            <label
              key={star}
              className="rounded-full focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
              onMouseEnter={() => setHover(star)}
            >
              <input
                type="radio"
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                className="sr-only"
                aria-label={`${label}: ${star} out of 5, ${word}`}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-11 items-center justify-center text-2xl transition-transform duration-150 active:scale-95 motion-reduce:transition-none",
                  shown >= star ? "text-brand" : "text-muted-foreground/35",
                )}
              >
                ★
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {value ? STAR_WORDS[value - 1] : "Nothing selected"}
      </p>
    </fieldset>
  );
}

export function PublicFeedbackFlow({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [ratings, setRatings] = useState<Record<string, number | undefined>>({});
  const [fields, setFields] = useState<CustomField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draftText, setDraftText] = useState("");
  const [draftWarnings, setDraftWarnings] = useState<string[]>([]);
  const [savedDrafts, setSavedDrafts] = useState(0);
  const atDraftLimit = savedDrafts >= MAX_DRAFTS_PER_SESSION;
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const draftStatusRef = useRef<HTMLParagraphElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const resolveRes = await fetch(`/api/v1/r/${encodeURIComponent(token)}`);
        const resolveBody = (await resolveRes.json()) as ResolvePayload & {
          error?: { code: string; message: string };
        };

        if (!resolveRes.ok) {
          throw new UserFacingError(
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
        setFields(resolveBody.fields ?? []);
        setRatings(
          Object.fromEntries(resolveBody.attributes.map((attr) => [attr.id, undefined])),
        );

        const sessionRes = await fetch(`/api/v1/r/${encodeURIComponent(token)}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientMeta: { locale: navigator.language },
          }),
        });
        const sessionBody = (await sessionRes.json()) as {
          sessionId?: string;
          error?: { message: string };
        };
        if (!sessionRes.ok || !sessionBody.sessionId) {
          throw new UserFacingError(sessionBody.error?.message ?? "Could not start a feedback session.");
        }

        if (cancelled) return;
        sessionIdRef.current = sessionBody.sessionId;
        setStep("rate");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(toUserMessage(err));
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

  const requiredFieldsFilled = useMemo(
    () =>
      fields.every(
        (field) => !field.isRequired || (answers[field.id] ?? "").trim().length > 0,
      ),
    [fields, answers],
  );

  const canSubmit = allRated && requiredFieldsFilled;
  const readyHint =
    step === "rate" && !canSubmit
      ? !requiredFieldsFilled
        ? "Fill in the required fields and rate every question."
        : "Rate every question to continue."
      : null;

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
          feedbackSessionId: sessionIdRef.current ?? undefined,
          props,
        }),
        keepalive: true,
      });
    } catch {
      // Analytics should not block the customer.
    }
  }

  async function requestDraft(regenerate: boolean) {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) return;
    setErrorMessage(null);
    setStatusMessage(regenerate ? "Rewriting your review…" : "Writing your review…");
    try {
      const response = await fetch(`/api/v1/r/${encodeURIComponent(token)}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackSessionId: currentSessionId,
          regenerate,
        }),
      });
      const body = (await response.json()) as {
        draft?: { text: string; warnings?: string[] };
        googleReviewUrl?: string;
        error?: { code?: string; message: string };
      };
      if (!response.ok) {
        if (body.error?.code === "draft_limit") {
          setSavedDrafts(MAX_DRAFTS_PER_SESSION);
        }
        throw new UserFacingError(body.error?.message ?? "Could not generate draft.");
      }
      setSavedDrafts((count) => count + 1);
      setDraftText(body.draft?.text ?? "");
      setDraftWarnings(body.draft?.warnings ?? []);
      if (body.googleReviewUrl) {
        setGoogleReviewUrl(body.googleReviewUrl);
      }
      setStatusMessage("Draft ready. Edit it if you want, then copy it.");
      draftStatusRef.current?.focus();
    } catch (err) {
      setStatusMessage(null);
      setErrorMessage(toUserMessage(err));
    }
  }

  function onSubmitFeedback() {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId || !canSubmit) return;
    startTransition(async () => {
      setErrorMessage(null);
      setStatusMessage("Saving your ratings…");
      try {
        const response = await fetch(`/api/v1/r/${encodeURIComponent(token)}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: currentSessionId,
            answers: fields
              .map((field) => ({
                fieldId: field.id,
                value: (answers[field.id] ?? "").trim(),
              }))
              .filter((answer) => answer.value !== ""),
            ratings: attributes.map((attr) => ({
              attributeId: attr.id,
              rating: ratings[attr.id],
            })),
          }),
        });
        const body = (await response.json()) as {
          error?: { message: string };
          next?: { googleReviewUrl?: string };
        };
        if (!response.ok) {
          throw new UserFacingError(body.error?.message ?? "Could not submit feedback.");
        }
        if (body.next?.googleReviewUrl) {
          setGoogleReviewUrl(body.next.googleReviewUrl);
        }
        setStep("draft");
        await requestDraft(false);
      } catch (err) {
        setStatusMessage(null);
        setErrorMessage(toUserMessage(err));
      }
    });
  }

  function onRegenerate() {
    startTransition(async () => {
      await requestDraft(true);
    });
  }

  async function onCopyDraft() {
    if (!draftText.trim()) return;
    try {
      await navigator.clipboard.writeText(draftText);
      setCopyState("copied");
      setStatusMessage("Copied. Paste it on Google.");
      await emitEvent("draft_copied", { length: draftText.length });
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
      setStatusMessage("Could not copy automatically. Select the text and copy.");
    }
  }

  function onContinueToGoogle(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!googleReviewUrl) {
      event.preventDefault();
      return;
    }
    void emitEvent("google_continue_clicked", {
      hadDraft: Boolean(draftText.trim()),
    });
  }

  const activeIndex = copyState === "copied" ? 2 : step === "draft" ? 1 : 0;
  const initial = businessName.trim().charAt(0).toUpperCase() || "R";

  if (step === "loading") {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <p className="text-sm text-muted-foreground">Opening feedback…</p>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (step === "error") {
    return (
      <section className="space-y-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-none">
          Link unavailable
        </h1>
        <p className="text-base text-muted-foreground" role="alert">
          {errorMessage ??
            "This QR code may be expired, revoked, or invalid. Ask the business for a new one."}
        </p>
      </section>
    );
  }

  const primaryLabel =
    step === "rate"
      ? pending
        ? "Writing your review…"
        : "Write my review"
      : copyState === "copied"
        ? "Copied"
        : "Copy review";

  return (
    <div className="space-y-8">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-100">
            {initial}
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Review for</p>
            <p className="font-medium">{businessName}</p>
          </div>
        </div>

        <ol className="grid grid-cols-3 gap-2" aria-label="Progress">
          {FLOW_STEPS.map((item, index) => {
            const current = index === activeIndex;
            const done = index < activeIndex;
            return (
              <li
                key={item.id}
                aria-current={current ? "step" : undefined}
                className="space-y-2"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full",
                    done || current ? "bg-brand" : "bg-muted",
                  )}
                />
                <span className={cn("text-xs", current ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {index + 1}. {item.label}
                </span>
              </li>
            );
          })}
        </ol>

        {step === "draft" ? (
          <section className="space-y-6">
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-none">
                Your review
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Edit anything that does not sound like you, then copy it onto Google. We never post
                for you.
              </p>
            </div>

            {draftText ? (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
                <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="draft-text">
                  Draft
                  <Textarea
                    id="draft-text"
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    rows={8}
                  />
                </label>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {wordCount(draftText)} words · {draftText.length} characters
                </p>
                {draftWarnings.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {draftWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                {atDraftLimit ? (
                  <p className="text-sm text-muted-foreground">{DRAFT_LIMIT_MESSAGE}</p>
                ) : (
                  <Button type="button" variant="outline" size="lg" disabled={pending} onClick={onRegenerate}>
                    {pending ? "Rewriting…" : "Regenerate"}
                  </Button>
                )}
              </div>
            ) : pending ? (
              <div className="space-y-3" aria-busy="true">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : null}

            {errorMessage ? (
              <div className="space-y-3">
                <p className="text-sm text-danger" role="alert">
                  {errorMessage}
                </p>
                {atDraftLimit ? null : (
                  <Button type="button" variant="outline" size="lg" disabled={pending} onClick={onRegenerate}>
                    Try again
                  </Button>
                )}
              </div>
            ) : null}
          </section>
        ) : (
          <section className="space-y-6">
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-none">
                How was your visit?
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                {fields.length > 0
                  ? "Tell us a little, then tap the stars. "
                  : "Tap the stars. "}
                Nothing is selected for you, and a low rating never hides Google.
              </p>
            </div>

            {fields.length > 0 ? (
              <div className="space-y-3">
                {fields.map((field) => {
                  const value = answers[field.id] ?? "";
                  const inputId = `field-${field.id}`;
                  const hintId = `${inputId}-hint`;
                  return (
                    <div
                      key={field.id}
                      className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-card"
                    >
                      <label htmlFor={inputId} className="block text-base font-medium">
                        {field.label}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {field.isRequired ? "(required)" : "(optional)"}
                        </span>
                      </label>
                      <Textarea
                        id={inputId}
                        value={value}
                        rows={2}
                        maxLength={field.maxLength}
                        required={field.isRequired}
                        aria-required={field.isRequired}
                        aria-describedby={hintId}
                        className="field-sizing-content max-h-64 min-h-14"
                        onChange={(event) =>
                          setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
                        }
                      />
                      <p id={hintId} className="text-xs text-muted-foreground tabular-nums">
                        {value.length} / {field.maxLength}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="space-y-3">
              {attributes.map((attr) => (
                <StarRow
                  key={attr.id}
                  name={attr.id}
                  label={attr.label}
                  value={ratings[attr.id]}
                  onChange={(value) =>
                    setRatings((prev) => ({
                      ...prev,
                      [attr.id]: value,
                    }))
                  }
                />
              ))}
            </div>

            {errorMessage ? (
              <p className="text-sm text-danger" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </section>
        )}

        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-card">
          <p ref={draftStatusRef} tabIndex={-1} className="text-sm text-muted-foreground outline-none" aria-live="polite">
            {statusMessage ?? readyHint}
          </p>
          {step === "rate" ? (
            <Button type="button" size="lg" disabled={!canSubmit || pending} onClick={onSubmitFeedback}>
              {primaryLabel}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={pending || !draftText.trim()}
              onClick={() => void onCopyDraft()}
            >
              {primaryLabel}
            </Button>
          )}
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onContinueToGoogle}
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Continue to Google
          </a>
        </div>
      </div>
  );
}
