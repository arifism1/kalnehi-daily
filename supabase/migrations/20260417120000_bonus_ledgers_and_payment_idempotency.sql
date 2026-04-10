-- Time-bounded bonus AI credits (30-day pools) + Razorpay payment idempotency.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS bonus_photo_scans_ledger jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bonus_voice_minutes_ledger jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.user_profiles.bonus_photo_scans_ledger IS
  'JSON array of {amount, expires_at} bonus photo scan pools (30-day expiry from purchase).';
COMMENT ON COLUMN public.user_profiles.bonus_voice_minutes_ledger IS
  'JSON array of {amount, expires_at} bonus voice minute pools (30-day expiry from purchase).';

-- Backfill existing flat counters into a single pool expiring 30 days from migration time.
UPDATE public.user_profiles
SET bonus_photo_scans_ledger = jsonb_build_array(
  jsonb_build_object(
    'amount', bonus_photo_scans,
    'expires_at', (now() + interval '30 days')::timestamptz
  )
)
WHERE bonus_photo_scans > 0;

UPDATE public.user_profiles
SET bonus_voice_minutes_ledger = jsonb_build_array(
  jsonb_build_object(
    'amount', bonus_voice_minutes,
    'expires_at', (now() + interval '30 days')::timestamptz
  )
)
WHERE bonus_voice_minutes > 0;

CREATE TABLE IF NOT EXISTS public.razorpay_processed_payments (
  razorpay_payment_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('extra_credits', 'plan_upgrade')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS razorpay_processed_payments_user_id_idx
  ON public.razorpay_processed_payments (user_id);

COMMENT ON TABLE public.razorpay_processed_payments IS
  'Prevents applying the same Razorpay payment twice (extra credits / plan upgrade).';

ALTER TABLE public.razorpay_processed_payments ENABLE ROW LEVEL SECURITY;
