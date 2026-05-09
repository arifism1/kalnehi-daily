/**
 * Authenticated waitlist join must use the session email for RPC contact fields and
 * transactional email — never an arbitrary body email (harassment / PII integrity).
 */
export function resolveAuthenticatedWaitlistContactEmail(
  bodyEmailNormalized: string,
  sessionEmail: string | null | undefined,
):
  | { ok: true; contactEmail: string }
  | { ok: false; error: string } {
  const session = sessionEmail?.trim().toLowerCase() ?? "";
  if (!session) {
    return {
      ok: false,
      error:
        "Your account does not have an email address. Add one in your account settings before joining the waitlist.",
    };
  }
  if (bodyEmailNormalized !== session) {
    return {
      ok: false,
      error: "Email must match the address you signed in with.",
    };
  }
  return { ok: true, contactEmail: session };
}
