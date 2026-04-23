-- Add email column to admin_users so admins can be identified by email
-- without needing to know their auth UUID upfront.

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS email text UNIQUE;

COMMENT ON COLUMN public.admin_users.email IS
  'Auth email for this admin. Either user_id or email (or both) can be used to grant access.';

-- Seed the two admin emails. user_id is set to a stable deterministic UUID
-- so we have a valid primary key. When these users log in their real UUID is
-- matched via the email column instead.
INSERT INTO public.admin_users (user_id, email) VALUES
  (gen_random_uuid(), 'arifborsola1@gmail.com'),
  (gen_random_uuid(), 'arifborsola2@gmail.com')
ON CONFLICT (email) DO NOTHING;
