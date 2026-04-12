import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_USER_LIST_PAGES = 100;
const USERS_PER_PAGE = 1000;

/**
 * Resolve a recipient string to a Supabase Auth user id (UUID or email lookup via admin API).
 */
export async function resolveRecipientUserId(
  supabase: SupabaseClient,
  raw: string,
): Promise<{ userId: string } | { error: string }> {
  const s = raw.trim();
  if (!s) {
    return { error: "Enter an email or user id." };
  }

  if (UUID_RE.test(s)) {
    const { data, error } = await supabase.auth.admin.getUserById(s);
    if (error || !data.user) {
      return { error: "No user found for that id." };
    }
    return { userId: data.user.id };
  }

  if (!s.includes("@")) {
    return { error: "Enter a valid email address or user id (UUID)." };
  }

  const target = s.toLowerCase();
  let page = 1;
  while (page <= MAX_USER_LIST_PAGES) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });
    if (error) {
      return { error: "Could not look up user by email." };
    }
    const users = data.users ?? [];
    const found = users.find((u) => u.email?.toLowerCase() === target);
    if (found) {
      return { userId: found.id };
    }
    if (users.length < USERS_PER_PAGE) {
      break;
    }
    page += 1;
  }

  return { error: "No user found with that email." };
}
