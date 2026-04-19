-- Manual DB smoke for prepbrain_ai_token_* RPCs (run in SQL editor as postgres / service role context).
-- Replace :user_id with a real auth.users id that has user_profiles and an eligible AI phase.

-- 1) Reserve (debits estimate, inserts row)
-- SELECT public.prepbrain_ai_token_reserve(
--   ':user_id'::uuid,
--   1500,
--   to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM')
-- );

-- 2) Inspect pending reservation + profile counters
-- SELECT id, estimate, expires_at, finalized_at, cancelled_at
-- FROM public.prepbrain_ai_token_reservations
-- WHERE user_id = ':user_id'::uuid
-- ORDER BY created_at DESC
-- LIMIT 3;
-- SELECT ai_usage_row_version, welcome_ai_tokens_used, paid_trial_ai_tokens_used, ai_tokens_used, bonus_ai_tokens
-- FROM public.user_profiles WHERE user_id = ':user_id'::uuid;

-- 3) Finalize with actual below estimate (refund path)
-- SELECT public.prepbrain_ai_token_finalize(':user_id'::uuid, ':reservation_id'::uuid, 800);

-- 4) Or finalize with actual above estimate (extra debit path) on a fresh reserve

-- 5) Cancel without finalize (refund full estimate to bonus)
-- SELECT public.prepbrain_ai_token_cancel_reservation(':user_id'::uuid, ':reservation_id'::uuid);

-- 6) Sweep expired pending rows (cron uses same RPC)
-- SELECT public.prepbrain_ai_token_sweep_expired();
