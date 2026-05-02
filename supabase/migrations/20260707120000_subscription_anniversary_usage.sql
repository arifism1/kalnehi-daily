-- Align usage_reset_date and ai_tokens_month with IST subscription-anniversary periods
-- (same day-of-month as subscription_start_date) without zeroing usage counters.

CREATE OR REPLACE FUNCTION public.subscription_anniversary_period_start_ist(
  p_subscription_start timestamptz,
  p_now timestamptz DEFAULT now()
)
RETURNS date
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  anchor date;
  today_ist date;
  cur date;
  next_p date;
BEGIN
  IF p_subscription_start IS NULL THEN
    RETURN NULL;
  END IF;

  anchor := (timezone('Asia/Kolkata', p_subscription_start))::date;
  today_ist := (timezone('Asia/Kolkata', p_now))::date;

  IF anchor > today_ist THEN
    RETURN anchor;
  END IF;

  cur := anchor;
  LOOP
    next_p := (cur + interval '1 month')::date;
    EXIT WHEN next_p > today_ist;
    cur := next_p;
  END LOOP;

  RETURN cur;
END;
$$;

COMMENT ON FUNCTION public.subscription_anniversary_period_start_ist(timestamptz, timestamptz) IS
  'IST calendar date when the current subscription-anniversary usage period began; used for voice/photo/Mastermind monthly buckets.';

UPDATE public.user_profiles
SET usage_reset_date = public.subscription_anniversary_period_start_ist(subscription_start_date, now())
WHERE subscription_start_date IS NOT NULL
  AND subscription_status IN ('active', 'cancelled', 'trial');

UPDATE public.user_profiles
SET ai_tokens_month = 'u:' || to_char(
  public.subscription_anniversary_period_start_ist(subscription_start_date, now()),
  'YYYY-MM-DD'
)
WHERE subscription_start_date IS NOT NULL
  AND subscription_status IN ('active', 'cancelled');

COMMENT ON COLUMN public.user_profiles.usage_reset_date IS
  'IST calendar date (YYYY-MM-DD) marking the start of the current subscription-anniversary usage period; '
  'voice, photo, and Mastermind base quotas roll when this no longer matches subscription_anniversary_period_start_ist(subscription_start_date).';

COMMENT ON COLUMN public.user_profiles.ai_tokens_month IS
  'Opaque period key for paid Mastermind base allowance (e.g. u:YYYY-MM-DD); must match the app-computed anniversary key for ai_tokens_used to apply.';
