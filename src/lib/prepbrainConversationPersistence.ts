import type { SupabaseClient } from "@supabase/supabase-js";

/** Aligned with MAX_MESSAGE_CHARS in prepbrain chat route. */
export const PREPBRAIN_DB_CONTENT_MAX = 2500;

export const PREPBRAIN_MAX_CONVERSATIONS_PER_USER = 50;
export const PREPBRAIN_MAX_MESSAGES_PER_CONVERSATION = 250;
export const PREPBRAIN_TITLE_MAX_CHARS = 80;

/**
 * Before spending LLM tokens: ensure this thread can accept the next user+assistant pair.
 * Unknown or wrong conversation id is treated as "will create new thread" (always has room).
 */
export async function prepbrainAssertRoomBeforeTurn(
  admin: SupabaseClient,
  userId: string,
  conversationId: string | null,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!conversationId) return { ok: true };
  const { data: convo, error: convoErr } = await admin
    .from("prepbrain_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (convoErr) {
    console.error("[prepbrain] conversation verify failed", convoErr);
    return { ok: false, error: "Could not verify chat.", status: 500 };
  }
  if (!convo) return { ok: true };
  const { count, error: cntErr } = await admin
    .from("prepbrain_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);
  if (cntErr) {
    console.error("[prepbrain] message count failed", cntErr);
    return { ok: false, error: "Could not verify chat.", status: 500 };
  }
  if ((count ?? 0) + 2 > PREPBRAIN_MAX_MESSAGES_PER_CONVERSATION) {
    return {
      ok: false,
      error:
        "This chat has reached the message limit. Start a new chat to continue.",
      status: 400,
    };
  }
  return { ok: true };
}

function truncateTitle(text: string): string {
  const line = text.trim().split(/\r?\n/)[0] ?? "";
  const t = line.slice(0, PREPBRAIN_TITLE_MAX_CHARS).trim();
  return t || "PrepBrain chat";
}

/**
 * Persists the latest user + assistant pair after a successful reply.
 * Creates a conversation when conversationId is null or not owned by user.
 */
export async function persistPrepbrainTurn(params: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
  userContent: string;
  assistantContent: string;
}): Promise<
  | { ok: true; conversationId: string }
  | { ok: false; error: string; status: number }
> {
  const { admin, userId, userContent, assistantContent } = params;
  let conversationId = params.conversationId;

  const clip = (s: string) =>
    s.length > PREPBRAIN_DB_CONTENT_MAX
      ? s.slice(0, PREPBRAIN_DB_CONTENT_MAX)
      : s;

  let convoRow: { id: string; title: string | null } | null = null;

  if (conversationId) {
    const { data, error } = await admin
      .from("prepbrain_conversations")
      .select("id, title")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[prepbrain] conversation lookup failed", error);
      return { ok: false, error: "Could not save chat. Try again.", status: 500 };
    }
    convoRow = data ?? null;
  }

  if (!convoRow) {
    const { count, error: countErr } = await admin
      .from("prepbrain_conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (countErr) {
      console.error("[prepbrain] conversation count failed", countErr);
      return { ok: false, error: "Could not save chat. Try again.", status: 500 };
    }
    const n = count ?? 0;
    if (n >= PREPBRAIN_MAX_CONVERSATIONS_PER_USER) {
      const { data: oldest, error: oldErr } = await admin
        .from("prepbrain_conversations")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (oldErr || !oldest?.id) {
        console.error("[prepbrain] oldest conversation lookup failed", oldErr);
        return { ok: false, error: "Could not save chat. Try again.", status: 500 };
      }
      const { error: delErr } = await admin
        .from("prepbrain_conversations")
        .delete()
        .eq("id", oldest.id)
        .eq("user_id", userId);
      if (delErr) {
        console.error("[prepbrain] prune oldest conversation failed", delErr);
        return { ok: false, error: "Could not save chat. Try again.", status: 500 };
      }
    }

    const { data: inserted, error: insErr } = await admin
      .from("prepbrain_conversations")
      .insert({ user_id: userId, title: null })
      .select("id, title")
      .single();
    if (insErr || !inserted) {
      console.error("[prepbrain] conversation insert failed", insErr);
      return { ok: false, error: "Could not save chat. Try again.", status: 500 };
    }
    convoRow = { id: inserted.id, title: inserted.title };
    conversationId = inserted.id;
  }

  const { count: msgCount, error: msgCountErr } = await admin
    .from("prepbrain_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);
  if (msgCountErr) {
    console.error("[prepbrain] message count failed", msgCountErr);
    return { ok: false, error: "Could not save chat. Try again.", status: 500 };
  }
  if ((msgCount ?? 0) + 2 > PREPBRAIN_MAX_MESSAGES_PER_CONVERSATION) {
    return {
      ok: false,
      error:
        "This chat has reached the message limit. Start a new chat to continue.",
      status: 400,
    };
  }

  const { data: maxPosRow } = await admin
    .from("prepbrain_messages")
    .select("position")
    .eq("conversation_id", conversationId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const basePos = typeof maxPosRow?.position === "number" ? maxPosRow.position : 0;

  const now = new Date().toISOString();
  const titleToSet =
    convoRow.title == null || convoRow.title.trim() === ""
      ? truncateTitle(userContent)
      : null;

  const { error: msgInsErr } = await admin.from("prepbrain_messages").insert([
    {
      conversation_id: conversationId,
      user_id: userId,
      message_role: "user",
      content: clip(userContent),
      position: basePos + 1,
      created_at: now,
    },
    {
      conversation_id: conversationId,
      user_id: userId,
      message_role: "assistant",
      content: clip(assistantContent),
      position: basePos + 2,
      created_at: now,
    },
  ]);
  if (msgInsErr) {
    console.error("[prepbrain] message insert failed", msgInsErr);
    return { ok: false, error: "Could not save chat. Try again.", status: 500 };
  }

  const { error: updErr } = await admin
    .from("prepbrain_conversations")
    .update({
      updated_at: now,
      ...(titleToSet ? { title: titleToSet } : {}),
    })
    .eq("id", conversationId)
    .eq("user_id", userId);
  if (updErr) {
    console.error("[prepbrain] conversation update failed", updErr);
  }

  if (!conversationId) {
    return { ok: false, error: "Could not save chat. Try again.", status: 500 };
  }
  return { ok: true, conversationId };
}
