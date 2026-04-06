"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import {
  isMicrotopicProgressStatus,
  type MicrotopicProgressStatus,
} from "@/lib/syllabusConstants";

export type ProgressRowPayload = {
  syllabus_master_id: string;
  status: string;
  last_updated: string;
};

export type UpdateMicrotopicStatusResult =
  | { ok: true; row: ProgressRowPayload }
  | { ok: false; error: string };

export type BulkUpdateResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

/**
 * Set many microtopics in one chapter to the same status in a single DB round-trip.
 */
export async function bulkUpdateChapterMicrotopics(
  syllabusMasterIds: string[],
  newStatus: string,
): Promise<BulkUpdateResult> {
  if (syllabusMasterIds.length === 0) return { ok: true, count: 0 };

  try {
    if (!isMicrotopicProgressStatus(newStatus)) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }

    const status = newStatus as MicrotopicProgressStatus;
    const lastUpdated = new Date().toISOString();

    const rows = syllabusMasterIds.map((id) => ({
      user_id: user.id,
      syllabus_master_id: normalizeSyllabusMasterId(id),
      status,
      last_updated: lastUpdated,
    }));

    const { error } = await supabase
      .from("user_microtopic_progress")
      .upsert(rows, { onConflict: "user_id,syllabus_master_id" });

    if (error) {
      console.error("[syllabus] bulk upsert error:", error.code, error.message);
      throw error;
    }

    return { ok: true, count: rows.length };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function updateMicrotopicStatus(
  syllabusMasterId: string,
  newStatus: string,
): Promise<UpdateMicrotopicStatusResult> {
  const normalizedId = normalizeSyllabusMasterId(syllabusMasterId);

  try {
    if (!isMicrotopicProgressStatus(newStatus)) {
      console.error("[syllabus] updateMicrotopicStatus: invalid status", newStatus);
      return { ok: false, error: USER_ERROR.tryAgain };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr) {
      console.error("[syllabus] auth error:", authErr.message);
      return { ok: false, error: USER_ERROR.session };
    }
    if (!user) {
      console.error("[syllabus] updateMicrotopicStatus: no user session");
      return { ok: false, error: USER_ERROR.session };
    }

    const status = newStatus as MicrotopicProgressStatus;
    const lastUpdated = new Date().toISOString();

    const payload = {
      user_id: user.id,
      syllabus_master_id: normalizedId,
      status,
      last_updated: lastUpdated,
    };

    const { data, error } = await supabase
      .from("user_microtopic_progress")
      .upsert(payload, {
        onConflict: "user_id,syllabus_master_id",
      })
      .select("syllabus_master_id, status, last_updated")
      .single();

    if (error) {
      console.error("[syllabus] upsert error:", error.code, error.message, error.details);
      throw error;
    }

    if (!data) {
      console.error(
        "[syllabus] upsert returned no row (check RLS SELECT on user_microtopic_progress)",
      );
      return {
        ok: false,
        error: USER_ERROR.syncPending,
      };
    }

    return {
      ok: true,
      row: {
        syllabus_master_id: normalizeSyllabusMasterId(data.syllabus_master_id),
        status: data.status,
        last_updated: data.last_updated,
      },
    };
  } catch (e) {
    const msg = formatSupabaseError(e);
    console.error("[syllabus] updateMicrotopicStatus failed:", msg);
    return { ok: false, error: msg };
  }
}

export type CustomSyllabusResult = { ok: true } | { ok: false; error: string };

export async function addCustomSyllabusItem(fields: {
  examName: string;
  subject: string;
  chapter: string;
  microtopic: string;
}): Promise<CustomSyllabusResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const examName = fields.examName.trim();
    const subject = fields.subject.trim();
    const chapter = fields.chapter.trim();
    const microtopic = fields.microtopic.trim();
    if (!examName || !subject || !chapter || !microtopic) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }

    const customRowId = randomUUID();
    const now = new Date().toISOString();

    const { error } = await supabase.from("user_syllabus_customizations").insert({
      user_id: user.id,
      exam_name: examName,
      action_type: "add",
      target_type: "microtopic",
      custom_row_id: customRowId,
      subject,
      chapter,
      microtopic,
      updated_at: now,
    });

    if (error) throw error;
    revalidatePath("/syllabus");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export type EditCustomSyllabusPayload =
  | {
      examName: string;
      mode: "user_add";
      customizationId: string;
      subject: string;
      chapter: string;
      microtopic: string;
    }
  | {
      examName: string;
      mode: "global_microtopic";
      syllabusMasterId: string;
      subjectOverride?: string | null;
      chapterOverride?: string | null;
      microtopicOverride?: string | null;
    }
  | {
      examName: string;
      mode: "chapter_rename";
      subject: string;
      chapterOld: string;
      chapterNew: string;
    };

export async function editCustomSyllabusItem(
  payload: EditCustomSyllabusPayload,
): Promise<CustomSyllabusResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const now = new Date().toISOString();

    if (payload.mode === "user_add") {
      const { error } = await supabase
        .from("user_syllabus_customizations")
        .update({
          subject: payload.subject.trim(),
          chapter: payload.chapter.trim(),
          microtopic: payload.microtopic.trim(),
          updated_at: now,
        })
        .eq("id", payload.customizationId)
        .eq("user_id", user.id)
        .eq("action_type", "add");
      if (error) throw error;
      revalidatePath("/syllabus");
      return { ok: true };
    }

    if (payload.mode === "global_microtopic") {
      const sid = normalizeSyllabusMasterId(payload.syllabusMasterId);
      const examName = payload.examName.trim();

      const s = payload.subjectOverride?.trim() || "";
      const c = payload.chapterOverride?.trim() || "";
      const m = payload.microtopicOverride?.trim() || "";
      const hasAny = Boolean(s || c || m);

      await supabase
        .from("user_syllabus_customizations")
        .delete()
        .eq("user_id", user.id)
        .eq("exam_name", examName)
        .eq("syllabus_master_id", sid)
        .eq("action_type", "edit")
        .eq("target_type", "microtopic");

      if (!hasAny) {
        revalidatePath("/syllabus");
        return { ok: true };
      }

      const { error } = await supabase.from("user_syllabus_customizations").insert({
        user_id: user.id,
        exam_name: examName,
        action_type: "edit",
        target_type: "microtopic",
        syllabus_master_id: sid,
        subject_override: s || null,
        chapter_override: c || null,
        microtopic_override: m || null,
        updated_at: now,
      });
      if (error) throw error;
      revalidatePath("/syllabus");
      return { ok: true };
    }

    const subject = payload.subject.trim();
    const chapterOld = payload.chapterOld.trim();
    const chapterNew = payload.chapterNew.trim();
    if (!subject || !chapterOld || !chapterNew) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }

    await supabase
      .from("user_syllabus_customizations")
      .delete()
      .eq("user_id", user.id)
      .eq("exam_name", payload.examName.trim())
      .eq("action_type", "edit")
      .eq("target_type", "chapter")
      .eq("subject", subject)
      .eq("chapter", chapterOld);

    const { error } = await supabase.from("user_syllabus_customizations").insert({
      user_id: user.id,
      exam_name: payload.examName.trim(),
      action_type: "edit",
      target_type: "chapter",
      subject,
      chapter: chapterOld,
      chapter_override: chapterNew,
      updated_at: now,
    });
    if (error) throw error;
    revalidatePath("/syllabus");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export type DeleteCustomSyllabusPayload =
  | { examName: string; mode: "user_add"; customizationId: string }
  | { examName: string; mode: "global_microtopic"; syllabusMasterId: string }
  | {
      examName: string;
      mode: "chapter";
      originSubject: string;
      originChapter: string;
    };

export async function deleteCustomSyllabusItem(
  payload: DeleteCustomSyllabusPayload,
): Promise<CustomSyllabusResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const examName = payload.examName.trim();

    if (payload.mode === "user_add") {
      const { error } = await supabase
        .from("user_syllabus_customizations")
        .delete()
        .eq("id", payload.customizationId)
        .eq("user_id", user.id)
        .eq("action_type", "add");
      if (error) throw error;
      revalidatePath("/syllabus");
      return { ok: true };
    }

    if (payload.mode === "global_microtopic") {
      const sid = normalizeSyllabusMasterId(payload.syllabusMasterId);
      await supabase
        .from("user_syllabus_customizations")
        .delete()
        .eq("user_id", user.id)
        .eq("exam_name", examName)
        .eq("syllabus_master_id", sid)
        .eq("action_type", "edit")
        .eq("target_type", "microtopic");

      const { error } = await supabase.from("user_syllabus_customizations").insert({
        user_id: user.id,
        exam_name: examName,
        action_type: "delete",
        target_type: "microtopic",
        syllabus_master_id: sid,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      revalidatePath("/syllabus");
      return { ok: true };
    }

    const os = payload.originSubject.trim();
    const oc = payload.originChapter.trim();
    if (!os || !oc) return { ok: false, error: USER_ERROR.tryAgain };

    const { error } = await supabase.from("user_syllabus_customizations").insert({
      user_id: user.id,
      exam_name: examName,
      action_type: "delete",
      target_type: "chapter",
      subject: os,
      chapter: oc,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    revalidatePath("/syllabus");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}
