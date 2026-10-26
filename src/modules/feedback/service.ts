import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertCompleteAttributeRatings,
  assertFieldAnswers,
  type AnswerFieldRule,
  type FeedbackSubmitInput,
} from "./schemas";
import { DEFAULT_SESSION_TTL_HOURS, type FeedbackSession } from "./types";

export class SessionExpiredError extends Error {
  constructor(message = "This feedback session has expired.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

export class SessionInvalidError extends Error {
  constructor(message = "Invalid feedback session.") {
    super(message);
    this.name = "SessionInvalidError";
  }
}

function expiresAtIso(hours = DEFAULT_SESSION_TTL_HOURS): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function isSessionExpired(session: {
  expires_at: string | null;
  status: string;
}): boolean {
  if (session.status === "expired") return true;
  if (!session.expires_at) return false;
  return new Date(session.expires_at).getTime() <= Date.now();
}

export async function createFeedbackSession(
  service: SupabaseClient,
  input: {
    businessId: string;
    qrCodeId: string;
    clientMeta?: Record<string, unknown>;
  },
): Promise<FeedbackSession> {
  const { data, error } = await service
    .from("feedback_sessions")
    .insert({
      business_id: input.businessId,
      qr_code_id: input.qrCodeId,
      status: "started",
      client_meta: input.clientMeta ?? {},
      expires_at: expiresAtIso(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as FeedbackSession;
}

export async function getFeedbackSession(
  service: SupabaseClient,
  sessionId: string,
): Promise<FeedbackSession | null> {
  const { data, error } = await service
    .from("feedback_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as FeedbackSession | null) ?? null;
}

export async function markSessionExpired(
  service: SupabaseClient,
  sessionId: string,
): Promise<void> {
  await service
    .from("feedback_sessions")
    .update({ status: "expired" })
    .eq("id", sessionId)
    .eq("status", "started");
}

export async function completeFeedback(
  service: SupabaseClient,
  args: {
    tokenBusinessId: string;
    tokenQrCodeId: string;
    requiredAttributeIds: string[];
    fields?: AnswerFieldRule[];
    input: FeedbackSubmitInput;
  },
): Promise<FeedbackSession> {
  const session = await getFeedbackSession(service, args.input.sessionId);
  if (!session) {
    throw new SessionInvalidError();
  }
  if (
    session.business_id !== args.tokenBusinessId ||
    session.qr_code_id !== args.tokenQrCodeId
  ) {
    throw new SessionInvalidError("Session does not match this QR.");
  }
  if (session.status === "completed" || session.status === "drafted") {
    throw new SessionInvalidError("Feedback already submitted for this session.");
  }
  if (isSessionExpired(session)) {
    await markSessionExpired(service, session.id);
    throw new SessionExpiredError();
  }
  if (session.status !== "started") {
    throw new SessionInvalidError(`Session status is ${session.status}`);
  }

  assertCompleteAttributeRatings(
    args.requiredAttributeIds,
    args.input.ratings,
  );

  // Validate before any write so a bad answer never leaves half a submission.
  const answers = assertFieldAnswers(args.fields ?? [], args.input.answers);

  const ratingRows = args.input.ratings.map((row) => ({
    session_id: session.id,
    attribute_id: row.attributeId,
    business_id: session.business_id,
    rating: row.rating,
  }));

  const { error: ratingsError } = await service
    .from("feedback_ratings")
    .insert(ratingRows);

  if (ratingsError) {
    throw new Error(ratingsError.message);
  }

  const sessionId = session.id;
  async function undoWrites() {
    await service.from("feedback_ratings").delete().eq("session_id", sessionId);
    await service
      .from("feedback_field_answers")
      .delete()
      .eq("session_id", sessionId);
  }

  if (answers.length > 0) {
    const { error: answersError } = await service
      .from("feedback_field_answers")
      .insert(
        answers.map((answer) => ({
          session_id: session.id,
          field_id: answer.fieldId,
          business_id: session.business_id,
          label: answer.label,
          value: answer.value,
        })),
      );

    if (answersError) {
      await undoWrites();
      throw new Error(answersError.message);
    }
  }

  const { data, error } = await service
    .from("feedback_sessions")
    .update({
      status: "completed",
      comment: args.input.comment,
      completed_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("status", "started")
    .select("*")
    .single();

  if (error) {
    await undoWrites();
    throw new Error(error.message);
  }

  return data as FeedbackSession;
}
