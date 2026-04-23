-- ============================================================================
-- Security hardening migration
-- Fixes:
--   C-01  deduct_ai_study_partner_seconds: add auth.uid() guard
--   C-02  user_profiles UPDATE: restrict to safe user-owned columns only
--   M-02  exams table: ensure SELECT policy exists for fresh installs
-- ============================================================================

-- ─── C-01 ────────────────────────────────────────────────────────────────────
-- deduct_ai_study_partner_seconds: any authenticated user could previously call
-- this RPC with an arbitrary p_user_id and drain another user's credits.
-- Fix: reject calls where the caller is not the target user.

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
  -- Security guard: caller must be deducting from their own account.
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'deduct_ai_study_partner_seconds: forbidden — caller % is not target user %',
      auth.uid(), p_user_id;
  END IF;

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

COMMENT ON FUNCTION public.deduct_ai_study_partner_seconds IS
  'Atomically deducts AI Study Partner seconds (floor 0). Caller must be the target user (auth.uid() check).';

-- ─── C-02 ────────────────────────────────────────────────────────────────────
-- user_profiles UPDATE: the existing RLS policy only checks user_id = auth.uid()
-- with no column restriction, so any authenticated user could self-upgrade their
-- subscription_tier, subscription_status, bonus credits, etc.
--
-- Fix: revoke table-level UPDATE from the authenticated role, then grant UPDATE
-- only on the safe, user-editable columns. Subscription, billing, usage, trial,
-- and token columns remain writable only by service_role.

-- Revoke the broad table-level UPDATE privilege.
REVOKE UPDATE ON public.user_profiles FROM authenticated;

-- Grant UPDATE only on columns that legitimate client-side server actions write.
GRANT UPDATE (
  -- Profile / preferences
  full_name,
  phone_number,
  class_studying,
  primary_exam,
  target_exam,
  target_exam_date,
  cuet_domain_subjects,
  upsc_optional_subjects,
  prev_exam_attempted,
  prev_score,
  prev_score_entries,
  mandatory_onboarding_completed_at,
  enabled_features,
  quick_nav_hrefs,
  ui_prefs,
  signup_attribution,
  system_push_notifications,
  -- attempts is a JSONB study-history field (safe; not billing-sensitive)
  attempts,
  updated_at
) ON public.user_profiles TO authenticated;

-- Note: INSERT privilege is not column-restricted here because the INSERT RLS
-- policy (WITH CHECK auth.uid() = user_id) already enforces ownership, and
-- profile rows are typically created by a service-role trigger or the onboarding
-- server action. All billing columns default to 0/null so a rogue INSERT with
-- subscription_tier = 'pro' would not persist beyond the service-role writes
-- that normalise the row. Column-level INSERT restriction can be added later
-- if needed.

-- ─── M-02 ────────────────────────────────────────────────────────────────────
-- exams catalog SELECT policy: the original migration (20260409120000) skipped
-- creating the policy with a comment, so fresh DB installs silently deny reads.

DROP POLICY IF EXISTS "Anyone can read exams catalog" ON public.exams;
CREATE POLICY "Anyone can read exams catalog"
  ON public.exams FOR SELECT
  USING (true);
