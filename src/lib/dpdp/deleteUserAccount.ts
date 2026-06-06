import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type DeleteUserAccountOptions = {
  userId: string;
  targetEmail?: string | null;
  /** When true, skip active-subscription block (admin User Lookup only). */
  skipSubscriptionCheck?: boolean;
};

export type DeleteUserAccountResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

export async function deleteUserAccount(
  opts: DeleteUserAccountOptions,
): Promise<DeleteUserAccountResult> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "Service unavailable.", status: 503 };
  }

  const userId = opts.userId.trim();
  const targetEmail = opts.targetEmail?.trim().toLowerCase() ?? "";

  let adminBlocked = false;
  const { data: byId } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (byId) adminBlocked = true;

  if (!adminBlocked && targetEmail) {
    const { data: byEmail } = await admin
      .from("admin_users")
      .select("user_id")
      .eq("email", targetEmail)
      .maybeSingle();
    if (byEmail) adminBlocked = true;
  }

  if (adminBlocked) {
    return { ok: false, error: "Cannot delete an admin account.", status: 403 };
  }

  if (!opts.skipSubscriptionCheck) {
    const { data: profile, error: profErr } = await admin
      .from("user_profiles")
      .select("subscription_status, razorpay_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profErr) {
      console.error("[deleteUserAccount] profile lookup failed:", profErr.message);
      return { ok: false, error: "Could not verify subscription status.", status: 500 };
    }

    if (
      profile?.subscription_status === "active" &&
      profile.razorpay_subscription_id
    ) {
      return {
        ok: false,
        error:
          "Cancel the active subscription first (Settings → Subscription → Cancel), then retry erasure.",
        status: 400,
      };
    }
  }

  const { error: waitlistErr } = await admin
    .from("waitlist_entries")
    .delete()
    .eq("user_id", userId);
  if (waitlistErr) {
    console.error("[deleteUserAccount] waitlist cleanup failed:", waitlistErr.message);
    return { ok: false, error: "Could not prepare account for deletion.", status: 500 };
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(userId, false);
  if (delErr) {
    console.error("[deleteUserAccount] auth delete failed:", delErr.message);
    return { ok: false, error: delErr.message, status: 500 };
  }

  return { ok: true };
}
