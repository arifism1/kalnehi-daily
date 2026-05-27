-- Add optional full_name to org_email_invitations so admins can record the
-- student's name when pre-approving their email. The column is nullable because
-- the bulk-paste flow doesn't require a name.
ALTER TABLE public.org_email_invitations
  ADD COLUMN IF NOT EXISTS full_name TEXT;
