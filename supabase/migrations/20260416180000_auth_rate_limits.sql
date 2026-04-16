-- Brute-force protection: attempt tracking + temporary blocks (server-side only).
-- Next.js calls RPCs with the service role; anon/authenticated cannot execute or read rows.

CREATE TABLE public.auth_rate_limit_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Login: failed password attempts per IP
  login_max_failures integer NOT NULL DEFAULT 5,
  login_window_minutes integer NOT NULL DEFAULT 15,
  login_block_minutes integer NOT NULL DEFAULT 20,
  -- Signup: submit attempts per IP
  signup_max_attempts integer NOT NULL DEFAULT 10,
  signup_window_minutes integer NOT NULL DEFAULT 60,
  signup_block_minutes integer NOT NULL DEFAULT 25,
  -- Password reset: requests per email bucket and per IP bucket
  password_reset_max_per_bucket integer NOT NULL DEFAULT 5,
  password_reset_window_minutes integer NOT NULL DEFAULT 60,
  password_reset_block_minutes integer NOT NULL DEFAULT 25,
  -- OTP verify (magic link / OTP flows)
  otp_max_failures integer NOT NULL DEFAULT 5,
  otp_window_minutes integer NOT NULL DEFAULT 15,
  otp_block_minutes integer NOT NULL DEFAULT 20
);

INSERT INTO public.auth_rate_limit_config (id)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM public.auth_rate_limit_config WHERE id = 1);

COMMENT ON TABLE public.auth_rate_limit_config IS
  'Single-row knobs for auth rate limits. UPDATE values to tune policy without redeploying app code.';

CREATE TABLE public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,
  action_type text NOT NULL CHECK (
    action_type = ANY (
      ARRAY[
        'login'::text,
        'signup'::text,
        'password_reset_email'::text,
        'password_reset_ip'::text,
        'otp_verify'::text
      ]
    )
  ),
  attempt_count integer NOT NULL DEFAULT 0,
  period_started_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  CONSTRAINT auth_rate_limits_bucket_action UNIQUE (bucket_key, action_type)
);

CREATE INDEX auth_rate_limits_blocked_until_idx
  ON public.auth_rate_limits (action_type, blocked_until)
  WHERE blocked_until IS NOT NULL;

COMMENT ON TABLE public.auth_rate_limits IS
  'Buckets: ip:<addr>, email:<normalized>, otp:<email>|<ip> — attempt_count + last_attempt_at per (bucket, action).';

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_rate_limit_config FROM anon, authenticated;
REVOKE ALL ON TABLE public.auth_rate_limits FROM anon, authenticated;

DROP POLICY IF EXISTS "auth_rate_limits_deny_anon_authenticated" ON public.auth_rate_limits;
CREATE POLICY "auth_rate_limits_deny_anon_authenticated"
  ON public.auth_rate_limits
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "auth_rate_limit_config_deny_anon_authenticated" ON public.auth_rate_limit_config;
CREATE POLICY "auth_rate_limit_config_deny_anon_authenticated"
  ON public.auth_rate_limit_config
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.auth_rate_limit_step(
  p_action_type text,
  p_bucket_key text,
  p_step text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.auth_rate_limit_config%ROWTYPE;
  rec public.auth_rate_limits%ROWTYPE;
  v_window interval;
  v_block interval;
  v_max integer;
  new_count integer;
BEGIN
  IF length(trim(p_bucket_key)) < 3 OR length(p_bucket_key) > 512 THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'invalid bucket');
  END IF;

  IF p_action_type NOT IN (
    'login',
    'signup',
    'password_reset_email',
    'password_reset_ip',
    'otp_verify'
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'invalid action');
  END IF;

  IF p_step NOT IN ('check', 'record_failure', 'record_success', 'record_attempt') THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'invalid step');
  END IF;

  SELECT * INTO cfg FROM public.auth_rate_limit_config WHERE id = 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  IF p_action_type IN ('login', 'otp_verify') THEN
    v_max := CASE WHEN p_action_type = 'login' THEN cfg.login_max_failures ELSE cfg.otp_max_failures END;
    v_window :=
      make_interval(mins => CASE WHEN p_action_type = 'login' THEN cfg.login_window_minutes ELSE cfg.otp_window_minutes END);
    v_block :=
      make_interval(mins => CASE WHEN p_action_type = 'login' THEN cfg.login_block_minutes ELSE cfg.otp_block_minutes END);
  ELSIF p_action_type = 'signup' THEN
    v_max := cfg.signup_max_attempts;
    v_window := make_interval(mins => cfg.signup_window_minutes);
    v_block := make_interval(mins => cfg.signup_block_minutes);
  ELSE
    v_max := cfg.password_reset_max_per_bucket;
    v_window := make_interval(mins => cfg.password_reset_window_minutes);
    v_block := make_interval(mins => cfg.password_reset_block_minutes);
  END IF;

  IF p_step = 'check' THEN
    SELECT * INTO rec
    FROM public.auth_rate_limits
    WHERE bucket_key = p_bucket_key AND action_type = p_action_type;

    IF FOUND AND rec.blocked_until IS NOT NULL AND rec.blocked_until > now() THEN
      RETURN jsonb_build_object(
        'allowed',
        false,
        'retry_after_minutes',
        GREATEST(
          1,
          CEIL(EXTRACT(EPOCH FROM (rec.blocked_until - now())) / 60.0)
        )::integer
      );
    END IF;

    RETURN jsonb_build_object('allowed', true);
  END IF;

  IF p_step = 'record_success' THEN
    DELETE FROM public.auth_rate_limits
    WHERE bucket_key = p_bucket_key AND action_type = p_action_type;
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF p_step NOT IN ('record_failure', 'record_attempt') THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'unsupported');
  END IF;

  IF p_step = 'record_failure' AND p_action_type NOT IN ('login', 'otp_verify') THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'record_failure only for login/otp');
  END IF;

  IF p_step = 'record_attempt' AND p_action_type NOT IN ('signup', 'password_reset_email', 'password_reset_ip') THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'record_attempt only for signup/password reset buckets');
  END IF;

  SELECT * INTO rec
  FROM public.auth_rate_limits
  WHERE bucket_key = p_bucket_key AND action_type = p_action_type
  FOR UPDATE;

  IF FOUND AND rec.blocked_until IS NOT NULL AND rec.blocked_until > now() THEN
    RETURN jsonb_build_object(
      'allowed',
      false,
      'retry_after_minutes',
      GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (rec.blocked_until - now())) / 60.0)
      )::integer
    );
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.auth_rate_limits (
      bucket_key,
      action_type,
      attempt_count,
      period_started_at,
      last_attempt_at,
      blocked_until
    )
    VALUES (
      p_bucket_key,
      p_action_type,
      1,
      now(),
      now(),
      NULL
    );

    IF (p_action_type IN ('login', 'otp_verify') AND 1 >= v_max)
       OR (p_action_type NOT IN ('login', 'otp_verify') AND 1 > v_max) THEN
      UPDATE public.auth_rate_limits
      SET blocked_until = now() + v_block
      WHERE bucket_key = p_bucket_key AND action_type = p_action_type;

      RETURN jsonb_build_object(
        'allowed',
        false,
        'blocked',
        true,
        'retry_after_minutes',
        CEIL(EXTRACT(EPOCH FROM v_block) / 60.0)::integer
      );
    END IF;

    RETURN jsonb_build_object('allowed', true, 'blocked', false);
  END IF;

  IF now() > rec.period_started_at + v_window THEN
    UPDATE public.auth_rate_limits
    SET
      attempt_count = 1,
      period_started_at = now(),
      last_attempt_at = now(),
      blocked_until = NULL
    WHERE id = rec.id;

    IF (p_action_type IN ('login', 'otp_verify') AND 1 >= v_max)
       OR (p_action_type NOT IN ('login', 'otp_verify') AND 1 > v_max) THEN
      UPDATE public.auth_rate_limits
      SET blocked_until = now() + v_block
      WHERE id = rec.id;

      RETURN jsonb_build_object(
        'allowed',
        false,
        'blocked',
        true,
        'retry_after_minutes',
        CEIL(EXTRACT(EPOCH FROM v_block) / 60.0)::integer
      );
    END IF;

    RETURN jsonb_build_object('allowed', true, 'blocked', false);
  END IF;

  new_count := rec.attempt_count + 1;

  UPDATE public.auth_rate_limits
  SET
    attempt_count = new_count,
    last_attempt_at = now()
  WHERE id = rec.id;

  IF (p_action_type IN ('login', 'otp_verify') AND new_count >= v_max)
     OR (p_action_type NOT IN ('login', 'otp_verify') AND new_count > v_max) THEN
    UPDATE public.auth_rate_limits
    SET blocked_until = now() + v_block
    WHERE id = rec.id;

    RETURN jsonb_build_object(
      'allowed',
      false,
      'blocked',
      true,
      'retry_after_minutes',
      CEIL(EXTRACT(EPOCH FROM v_block) / 60.0)::integer
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'blocked', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_rate_limit_password_reset(
  p_step text,
  p_ip text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  em text := lower(trim(p_email));
  email_key text;
  ip_key text;
  r jsonb;
BEGIN
  IF em IS NULL OR em = '' OR length(em) > 320 THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'invalid email');
  END IF;

  IF p_ip IS NULL OR length(trim(p_ip)) < 3 OR length(p_ip) > 128 THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'invalid ip');
  END IF;

  email_key := 'email:' || em;
  ip_key := 'ip:' || trim(p_ip);

  IF p_step = 'check' THEN
    r := public.auth_rate_limit_step('password_reset_email', email_key, 'check');
    IF (r->>'allowed') IS DISTINCT FROM 'true' THEN
      RETURN r;
    END IF;

    r := public.auth_rate_limit_step('password_reset_ip', ip_key, 'check');
    RETURN r;
  ELSIF p_step = 'record_attempt' THEN
    r := public.auth_rate_limit_step('password_reset_email', email_key, 'record_attempt');
    IF (r->>'allowed') IS DISTINCT FROM 'true' THEN
      RETURN r;
    END IF;

    r := public.auth_rate_limit_step('password_reset_ip', ip_key, 'record_attempt');
    RETURN r;
  ELSE
    RETURN jsonb_build_object('allowed', false, 'error', 'invalid step');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.auth_rate_limit_step(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_rate_limit_password_reset(text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_rate_limit_step(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.auth_rate_limit_password_reset(text, text, text) TO service_role;

ALTER FUNCTION public.auth_rate_limit_step(text, text, text) SET search_path = public;
ALTER FUNCTION public.auth_rate_limit_password_reset(text, text, text) SET search_path = public;
