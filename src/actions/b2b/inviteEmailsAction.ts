"use server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { grantOrgSubscriptionInternal } from "@/lib/b2b/orgSubscription";

export type InviteEmailsInput = {
  orgId: string;
  /**
   * List of students to pre-approve. Each entry requires an email; full_name
   * is optional (collected in the single-add form, omitted in bulk paste).
   */
  invitees: Array<{ email: string; full_name?: string }>;
  batchId?: string | null;
  role: "student" | "faculty" | "admin" | "parent";
};

export type InviteEmailsResult =
  | { ok: true; invited: number; linked: number }
  | { ok: false; error: string };

/**
 * Adds students to the org_email_invitations allowlist (platform-admin only).
 *
 * For each invitee:
 *   1. Upsert a pending row in org_email_invitations (stores email + full_name).
 *   2. Check whether a Supabase auth user already exists for that email via the
 *      Admin REST API. If found, immediately insert a user_organization_memberships
 *      row, update their app_metadata JWT claim, grant Smart Plan access, and
 *      mark the invite accepted.
 *
 * Students who don't have an account yet will be auto-linked by proxy.ts on
 * their first login after they sign up at kalnehi.com/auth.
 */
export async function inviteEmailsAction(
  input: InviteEmailsInput,
): Promise<InviteEmailsResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) return { ok: false, error: "Forbidden." };

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return { ok: false, error: "Service unavailable." };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, error: "Service unavailable." };
  }

  // Normalise: lowercase + dedupe, keep name mapping.
  const nameMap = new Map<string, string | undefined>();
  for (const invitee of input.invitees) {
    const email = invitee.email.trim().toLowerCase();
    if (email.includes("@")) {
      // First mention of an email wins the name slot.
      if (!nameMap.has(email)) {
        nameMap.set(email, invitee.full_name?.trim() || undefined);
      }
    }
  }

  const emails = [...nameMap.keys()];
  if (emails.length === 0) {
    return { ok: false, error: "No valid email addresses provided." };
  }

  // 1. Upsert all emails into the allowlist (on conflict: do nothing so we
  //    don't overwrite an existing pending invite's batch/role/name).
  const inviteRows = emails.map((email) => ({
    organization_id: input.orgId,
    batch_id: input.batchId ?? null,
    email,
    role: input.role,
    full_name: nameMap.get(email) ?? null,
  }));

  const { error: upsertErr } = await serviceClient
    .from("org_email_invitations")
    .upsert(inviteRows, {
      onConflict: "email,organization_id",
      ignoreDuplicates: true,
    });

  if (upsertErr) return { ok: false, error: upsertErr.message };

  // 2. For each email, check if a Supabase user already exists.
  //    Link them immediately if so and mark the invite accepted.
  let linked = 0;

  await Promise.all(
    emails.map(async (email) => {
      try {
        const res = await fetch(
          `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=2`,
          {
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
            cache: "no-store",
          },
        );
        if (!res.ok) return;

        const json = (await res.json()) as {
          users?: Array<{ id: string; email?: string }>;
        };
        const match = (json.users ?? []).find(
          (u) => u.email?.toLowerCase() === email,
        );
        if (!match) return;

        // User exists — insert membership immediately.
        const { error: memberErr } = await serviceClient
          .from("user_organization_memberships")
          .upsert(
            {
              user_id: match.id,
              organization_id: input.orgId,
              batch_id: input.batchId ?? null,
              role: input.role,
            },
            { onConflict: "user_id,organization_id" },
          );
        if (memberErr) return;

        // Sync JWT claim.
        await serviceClient.auth.admin.updateUserById(match.id, {
          app_metadata: { organization_id: input.orgId },
        });

        // Grant Smart Plan access immediately.
        await grantOrgSubscriptionInternal(serviceClient, match.id);

        // Pre-fill full_name on user_profiles if the invite had a name and the
        // profile field is currently blank.
        const inviteeName = nameMap.get(email);
        if (inviteeName) {
          const { data: existingProfile } = await serviceClient
            .from("user_profiles")
            .select("full_name")
            .eq("user_id", match.id)
            .maybeSingle();
          const ep = existingProfile as { full_name?: string | null } | null;
          if (!ep?.full_name) {
            await serviceClient
              .from("user_profiles")
              .update({
                full_name: inviteeName,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", match.id);
          }
        }

        // Mark invite accepted.
        await serviceClient
          .from("org_email_invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("email", email)
          .eq("organization_id", input.orgId);

        linked++;
      } catch {
        // Non-fatal: leave the invite pending for proxy.ts to pick up.
      }
    }),
  );

  return { ok: true, invited: emails.length, linked };
}
