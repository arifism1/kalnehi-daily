-- AI Study Partner: non-expiring hour credits stored as seconds.
-- Credits are sold via Razorpay Orders (one-time) and deducted at session end.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ai_study_partner_seconds_remaining integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_profiles.ai_study_partner_seconds_remaining IS
  'Non-expiring AI Study Partner credits in seconds. Deducted at the end of each AI-partnered study session.';

-- ---------------------------------------------------------------------------
-- Add seconds (called by verifyExtraCreditsPayment via service role)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.add_ai_study_partner_seconds(
  p_user_id uuid,
  p_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'add_ai_study_partner_seconds: p_user_id is required';
  END IF;
  IF p_seconds IS NULL OR p_seconds <= 0 THEN
    RAISE EXCEPTION 'add_ai_study_partner_seconds: p_seconds must be positive';
  END IF;

  UPDATE public.user_profiles
  SET
    ai_study_partner_seconds_remaining = ai_study_partner_seconds_remaining + p_seconds,
    updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'add_ai_study_partner_seconds: profile not found for user %', p_user_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Deduct seconds (called by authenticated user at session end)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.deduct_ai_study_partner_seconds(
  p_user_id uuid,
  p_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'deduct_ai_study_partner_seconds: p_user_id is required';
  END IF;
  IF p_seconds IS NULL OR p_seconds <= 0 THEN
    RETURN; -- nothing to deduct
  END IF;

  UPDATE public.user_profiles
  SET
    ai_study_partner_seconds_remaining = GREATEST(0, ai_study_partner_seconds_remaining - p_seconds),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.add_ai_study_partner_seconds(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_ai_study_partner_seconds(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.add_ai_study_partner_seconds(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_ai_study_partner_seconds(uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.add_ai_study_partner_seconds IS
  'Adds AI Study Partner seconds to a user profile (service_role only).';
COMMENT ON FUNCTION public.deduct_ai_study_partner_seconds IS
  'Atomically deducts AI Study Partner seconds (floor 0) from a user profile (authenticated).';
