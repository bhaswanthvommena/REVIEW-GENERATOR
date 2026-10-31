import type { SupabaseClient } from "@supabase/supabase-js";
import { generateReviewDraft, type GenerateDraftResult } from "./generate";
import { DRAFT_LIMIT_MESSAGE, MAX_DRAFTS_PER_SESSION } from "./limits";

export type ReviewDraftRow = {
  id: string;
  feedback_session_id: string;
  business_id: string;
  draft_text: string;
  model: string;
  prompt_version: string;
  usage: Record<string, unknown>;
  validation: Record<string, unknown>;
  created_at: string;
};

type SessionContext = {
  session: {
    id: string;
    business_id: string;
    qr_code_id: string;
    status: string;
    comment: string | null;
  };
  businessName: string;
  businessCategory: string | null;
  businessLocation: string | null;
  ratings: Array<{ label: string; rating: number }>;
  fields: Array<{ label: string; value: string }>;
  /** Latest earlier draft, only loaded when regenerating. */
  previousDraft: string | null;
};

export async function loadSessionContextForDraft(
  service: SupabaseClient,
  sessionId: string,
  options?: { withPreviousDraft?: boolean },
): Promise<SessionContext> {
  const { data: session, error: sessionError } = await service
    .from("feedback_sessions")
    .select("id, business_id, qr_code_id, status, comment")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }
  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }
  if (session.status !== "completed" && session.status !== "drafted") {
    throw new Error("SESSION_NOT_READY");
  }

  // Everything else only needs the session, so fetch it in parallel.
  const [business, ratingRows, answerRows, previous] = await Promise.all([
    service
      .from("businesses")
      .select("name, category, location")
      .eq("id", session.business_id)
      .single(),
    service
      .from("feedback_ratings")
      .select("rating, attribute_id, rating_attributes(label)")
      .eq("session_id", sessionId),
    service
      .from("feedback_field_answers")
      .select("label, value")
      .eq("session_id", sessionId),
    options?.withPreviousDraft
      ? service
          .from("review_drafts")
          .select("draft_text")
          .eq("feedback_session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (business.error || !business.data) {
    throw new Error("BUSINESS_NOT_FOUND");
  }
  if (ratingRows.error) {
    throw new Error(ratingRows.error.message);
  }
  if (answerRows.error) {
    throw new Error(answerRows.error.message);
  }

  const ratings = (ratingRows.data ?? []).map((row) => {
    const attr = row.rating_attributes as
      | { label: string }
      | { label: string }[]
      | null;
    const label = Array.isArray(attr) ? attr[0]?.label : attr?.label;
    return {
      label: label ?? "Attribute",
      rating: row.rating as number,
    };
  });

  return {
    session: session as SessionContext["session"],
    businessName: business.data.name as string,
    businessCategory: (business.data.category as string | null) ?? null,
    businessLocation: (business.data.location as string | null) ?? null,
    ratings,
    fields: (answerRows.data ?? []).map((row) => ({
      label: row.label as string,
      value: row.value as string,
    })),
    previousDraft:
      (previous.data as { draft_text?: string } | null)?.draft_text ?? null,
  };
}

export class DraftLimitError extends Error {
  constructor(message = DRAFT_LIMIT_MESSAGE) {
    super(message);
    this.name = "DraftLimitError";
  }
}

/**
 * Insert the draft row atomically, enforcing the per-session cap inside Postgres.
 * The DB function locks the session row first, then checks the count, then inserts —
 * eliminating the check-then-insert race condition.
 */
export async function persistReviewDraft(
  service: SupabaseClient,
  input: {
    feedbackSessionId: string;
    businessId: string;
    result: GenerateDraftResult;
  },
): Promise<ReviewDraftRow> {
  const { data: newId, error } = await service.rpc("insert_review_draft_capped", {
    p_session_id: input.feedbackSessionId,
    p_business_id: input.businessId,
    p_draft_text: input.result.draftText,
    p_model: input.result.model,
    p_prompt_version: input.result.promptVersion,
    p_usage: input.result.usage,
    p_validation: input.result.validation,
    p_max_drafts: MAX_DRAFTS_PER_SESSION,
  });

  if (error) {
    if (error.message.includes("DRAFT_LIMIT_EXCEEDED")) {
      throw new DraftLimitError();
    }
    throw new Error(error.message);
  }

  // The RPC returns just the new UUID; fetch the full row for the caller.
  const { data: row, error: fetchError } = await service
    .from("review_drafts")
    .select("*")
    .eq("id", newId as string)
    .single();

  if (fetchError || !row) {
    throw new Error(fetchError?.message ?? "Draft row not found after insert");
  }
  return row as ReviewDraftRow;
}

export async function markSessionDrafted(
  service: SupabaseClient,
  sessionId: string,
): Promise<void> {
  await service
    .from("feedback_sessions")
    .update({ status: "drafted" })
    .eq("id", sessionId)
    .in("status", ["completed", "drafted"]);
}

export type DraftTimings = {
  contextMs: number;
  generateMs: number;
  insertMs: number;
};

export async function createDraftForSession(
  service: SupabaseClient,
  sessionId: string,
  options?: {
    regenerate?: boolean;
    /** The session must belong to this QR and business. */
    expect?: { businessId: string; qrCodeId: string };
  },
): Promise<{
  draft: ReviewDraftRow;
  generated: GenerateDraftResult;
  sessionId: string;
  timings: DraftTimings;
}> {
  const t0 = performance.now();
  const ctx = await loadSessionContextForDraft(service, sessionId, {
    withPreviousDraft: options?.regenerate,
  });
  if (
    options?.expect &&
    (ctx.session.business_id !== options.expect.businessId ||
      ctx.session.qr_code_id !== options.expect.qrCodeId)
  ) {
    throw new Error("SESSION_MISMATCH");
  }
  const t1 = performance.now();

  const generated = await generateReviewDraft({
    businessName: ctx.businessName,
    businessCategory: ctx.businessCategory,
    businessLocation: ctx.businessLocation,
    ratings: ctx.ratings,
    fields: ctx.fields,
    comment: ctx.session.comment,
    previousDraft: ctx.previousDraft,
  });
  const t2 = performance.now();

  // persistReviewDraft now handles the cap check atomically in Postgres.
  const draft = await persistReviewDraft(service, {
    feedbackSessionId: ctx.session.id,
    businessId: ctx.session.business_id,
    result: generated,
  });
  const t3 = performance.now();

  return {
    draft,
    generated,
    sessionId: ctx.session.id,
    timings: {
      contextMs: Math.round(t1 - t0),
      generateMs: Math.round(t2 - t1),
      insertMs: Math.round(t3 - t2),
    },
  };
}
