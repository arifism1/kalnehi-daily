-- Add audit columns to admin_users so we can see when a real Supabase user_id
-- was claimed from the seeded placeholder, and who last updated each row.
--
-- Background: admin rows are seeded with a random gen_random_uuid() as user_id.
-- On first login the real auth UUID is written to user_id. This migration adds
-- user_id_claimed_at so we can distinguish "never logged in" from "claimed".

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS user_id_claimed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.admin_users.user_id_claimed_at IS
  'Timestamp when the placeholder user_id was replaced with the real Supabase auth UUID on first admin login.';

COMMENT ON COLUMN public.admin_users.updated_at IS
  'Last time any field on this row was modified.';
