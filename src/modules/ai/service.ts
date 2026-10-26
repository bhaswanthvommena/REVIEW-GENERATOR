import type { SupabaseClient } from "@supabase/supabase-js";
import { generateReviewDraft, type GenerateDraftResult } from "./generate";

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

export async function loadSessionContextForDraft(
  service: SupabaseClient,
  sessionId: string,
): Promise<{
  session: {
    id: string;
    business_id: string;
    qr_code_id: string;
    status: string;
    comment: string | null;
  };
  businessName: string;
  businessCategory: string | null;
  ratings: Array<{ label: string; rating: number }>;
  fields: Array<{ label: string; value: string }>;
}> {
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

  const { data: business, error: businessError } = await service
    .from("businesses")
    .select("name, category")
    .eq("id", session.business_id)
    .single();

  if (businessError || !business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const { data: ratingRows, error: ratingsError } = await service
    .from("feedback_ratings")
    .select("rating, attribute_id, rating_attributes(label)")
    .eq("session_id", sessionId);

  if (ratingsError) {
    throw new Error(ratingsError.message);
  }

  const ratings = (ratingRows ?? []).map((row) => {
    const attr = row.rating_attributes as
      | { label: string }
      | { label: string }[]
      | null;
    const label = Array.isArray(attr)
      ? attr[0]?.label
      : attr?.label;
    return {
      label: label ?? "Attribute",
      rating: row.rating as number,
    };
  });

  const { data: answerRows, error: answersError } = await service
    .from("feedback_field_answers")
    .select("label, value")
    .eq("session_id", sessionId);

  if (answersError) {
    throw new Error(answersError.message);
  }

  return {
    session: session as {
      id: string;
      business_id: string;
      qr_code_id: string;
      status: string;
      comment: string | null;
    },
    businessName: business.name as string,
    businessCategory: (business.category as string | null) ?? null,
    ratings,
    fields: (answerRows ?? []).map((row) => ({
      label: row.label as string,
      value: row.value as string,
    })),
  };
}

export async function persistReviewDraft(
  service: SupabaseClient,
  input: {
    feedbackSessionId: string;
    businessId: string;
    result: GenerateDraftResult;
  },
): Promise<ReviewDraftRow> {
  const { data, error } = await service
    .from("review_drafts")
    .insert({
      feedback_session_id: input.feedbackSessionId,
      business_id: input.businessId,
      draft_text: input.result.draftText,
      model: input.result.model,
      prompt_version: input.result.promptVersion,
      usage: input.result.usage,
      validation: input.result.validation,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await service
    .from("feedback_sessions")
    .update({ status: "drafted" })
    .eq("id", input.feedbackSessionId)
    .in("status", ["completed", "drafted"]);

  return data as ReviewDraftRow;
}

export async function createDraftForSession(
  service: SupabaseClient,
  sessionId: string,
  options?: { regenerate?: boolean },
): Promise<{ draft: ReviewDraftRow; generated: GenerateDraftResult }> {
  const ctx = await loadSessionContextForDraft(service, sessionId);
  let previousDraft: string | null = null;
  if (options?.regenerate) {
    const { data: latest } = await service
      .from("review_drafts")
      .select("draft_text")
      .eq("feedback_session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    previousDraft = (latest?.draft_text as string | undefined) ?? null;
  }

  const generated = await generateReviewDraft({
    businessName: ctx.businessName,
    businessCategory: ctx.businessCategory,
    ratings: ctx.ratings,
    fields: ctx.fields,
    comment: ctx.session.comment,
    previousDraft,
  });

  const draft = await persistReviewDraft(service, {
    feedbackSessionId: ctx.session.id,
    businessId: ctx.session.business_id,
    result: generated,
  });

  return { draft, generated };
}

