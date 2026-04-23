"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePaidOrTrialAccess } from "@/lib/subscriptionGuard";
import type { Tables, TablesInsert } from "@/types/supabase";

export type MistakeLogRow = Tables<"mistake_logs">;

export type MistakeType = "knowledge_gap" | "application_error" | "careless" | "time_pressure";
export type MistakeSource = "mock_test" | "practice" | "class" | "other";

export type CreateMistakeLogInput = {
  subject: string;
  syllabusMasterId?: string | null;
  topicLabel?: string | null;
  mistakeType: MistakeType;
  source?: MistakeSource | null;
  mockTestId?: string | null;
  note?: string | null;
  flagForRevision?: boolean;
};

export async function createMistakeLog(
  input: CreateMistakeLogInput,
): Promise<{ ok: true; data: MistakeLogRow } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const access = await requirePaidOrTrialAccess(supabase, user.id);
    if (!access.ok) return access;

    // Verify that the referenced mock_test belongs to this user to prevent
    // cross-user FK linking via a guessed mock_test UUID.
    if (input.mockTestId) {
      const { data: testRow, error: testErr } = await supabase
        .from("mock_tests")
        .select("id")
        .eq("id", input.mockTestId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (testErr) return { ok: false, error: testErr.message };
      if (!testRow) return { ok: false, error: "Mock test not found." };
    }

    const payload: TablesInsert<"mistake_logs"> = {
      user_id: user.id,
      subject: input.subject,
      syllabus_master_id: input.syllabusMasterId ?? null,
      topic_label: input.topicLabel ?? null,
      mistake_type: input.mistakeType,
      source: input.source ?? null,
      mock_test_id: input.mockTestId ?? null,
      note: input.note ?? null,
      flag_for_revision: input.flagForRevision ?? false,
    };

    const { data, error } = await supabase
      .from("mistake_logs")
      .insert(payload)
      .select()
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/mistake-log");
    return { ok: true, data: data as MistakeLogRow };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function updateMistakeLog(
  id: string,
  updates: Partial<CreateMistakeLogInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const patch: Record<string, unknown> = {};
    if (updates.subject !== undefined) patch.subject = updates.subject;
    if (updates.syllabusMasterId !== undefined) patch.syllabus_master_id = updates.syllabusMasterId;
    if (updates.topicLabel !== undefined) patch.topic_label = updates.topicLabel;
    if (updates.mistakeType !== undefined) patch.mistake_type = updates.mistakeType;
    if (updates.source !== undefined) patch.source = updates.source;
    if (updates.mockTestId !== undefined) patch.mock_test_id = updates.mockTestId;
    if (updates.note !== undefined) patch.note = updates.note;
    if (updates.flagForRevision !== undefined) patch.flag_for_revision = updates.flagForRevision;

    const { error } = await supabase
      .from("mistake_logs")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/mistake-log");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function deleteMistakeLog(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const { error } = await supabase
      .from("mistake_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/mistake-log");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export type GetMistakeLogsFilter = {
  subject?: string;
  mistakeType?: MistakeType;
  daysBack?: number;
};

export async function getMistakeLogs(
  filter?: GetMistakeLogsFilter,
): Promise<{ ok: true; data: MistakeLogRow[] } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    let query = supabase
      .from("mistake_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false });

    if (filter?.subject) {
      query = query.eq("subject", filter.subject);
    }
    if (filter?.mistakeType) {
      query = query.eq("mistake_type", filter.mistakeType);
    }
    if (filter?.daysBack) {
      const since = new Date();
      since.setDate(since.getDate() - filter.daysBack);
      query = query.gte("logged_at", since.toISOString());
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as MistakeLogRow[] };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
