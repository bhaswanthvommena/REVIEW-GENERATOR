-- Atomic draft-cap enforcement: count existing drafts FOR UPDATE, then insert.
-- Prevents the check-then-insert race condition that could produce > MAX_DRAFTS_PER_SESSION drafts.

CREATE OR REPLACE FUNCTION public.insert_review_draft_capped(
  p_session_id     uuid,
  p_business_id    uuid,
  p_draft_text     text,
  p_model          text,
  p_prompt_version text,
  p_usage          jsonb,
  p_validation     jsonb,
  p_max_drafts     int DEFAULT 2
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_count int;
  v_id    uuid;
BEGIN
  -- Lock the session row to serialise concurrent draft requests for the same session.
  PERFORM 1
    FROM public.feedback_sessions
    WHERE id = p_session_id
    FOR UPDATE;

  SELECT COUNT(*)
    INTO v_count
    FROM public.review_drafts
    WHERE feedback_session_id = p_session_id;

  IF v_count >= p_max_drafts THEN
    RAISE EXCEPTION 'DRAFT_LIMIT_EXCEEDED';
  END IF;

  INSERT INTO public.review_drafts
    (feedback_session_id, business_id, draft_text, model, prompt_version, usage, validation)
  VALUES
    (p_session_id, p_business_id, p_draft_text, p_model, p_prompt_version, p_usage, p_validation)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_review_draft_capped(uuid, uuid, text, text, text, jsonb, jsonb, int)
  TO service_role;
