-- Pre-approved email allowlist for B2B student enrollment.
-- When an admin adds emails here, proxy.ts checks this table on a user's first
-- login. If their email matches a pending row, they are automatically inserted
-- into user_organization_memberships and the accepted_at timestamp is set.
-- This covers both brand-new signups and existing B2C users who later log in.

CREATE TABLE IF NOT EXISTS public.org_email_invitations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  batch_id         UUID        REFERENCES public.org_batches(id) ON DELETE SET NULL,
  email            TEXT        NOT NULL,
  role             TEXT        NOT NULL DEFAULT 'student'
                                CHECK (role IN ('student', 'faculty', 'admin', 'parent')),
  invited_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at      TIMESTAMPTZ,                          -- NULL = pending; set when proxy auto-links
  UNIQUE(email, organization_id)
);

COMMENT ON TABLE public.org_email_invitations IS
  'Pre-approved email allowlist for B2B orgs. Rows with accepted_at IS NULL are pending; '
  'proxy.ts reads these on first login and auto-enrolls the user.';

ALTER TABLE public.org_email_invitations ENABLE ROW LEVEL SECURITY;
-- No policies for the authenticated role: all access is via the service-role key
-- (server actions + proxy.ts). Authenticated users cannot read or write this table.

-- Partial index for the hot path in proxy.ts (only pending rows, keyed by email).
CREATE INDEX IF NOT EXISTS idx_org_email_invitations_pending_email
  ON public.org_email_invitations (email)
  WHERE accepted_at IS NULL;
