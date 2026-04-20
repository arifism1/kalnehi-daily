"use server";

import { isRevisionSessionKind, type RevisionSessionKind } from "@/lib/revision/constants";
import { suggestIntervalRangeForStars } from "@/lib/revision/spacing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USER_ERROR } from "@/lib/userFacingErrors";
import type { Json } from "@/types/supabase";

export type RecordRevisionLogInput = {
  syllabusMasterId: string | null;
  topicTitle: string;
  sessionKind: RevisionSessionKind;
  recallTranscript?: string | null;
  groqModel?: string | null;
  groqFeedback?: Json | null;
  confidenceStars?: number | null;
  suggestedNextReviewDate?: string | null;
  nextReviewEffectiveDate?: string | null;
  userOverrodeNextReview?: boolean;
};

/**
 * Inserts a revision log row. For recall sessions, also upsert topic state.
 */
export async function appendRevisionLog(
  input: RecordRevisionLogInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!isRevisionSessionKind(input.sessionKind)) {
    return { ok: false, error: USER_ERROR.tryAgain };
  }
  const title = (input.topicTitle ?? "").trim();
  if (!title) {
    return { ok: false, error: "Topic title is required." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in." };
  }

  const row = {
    user_id: user.id,
    syllabus_master_id: input.syllabusMasterId,
    topic_title: title,
    session_kind: input.sessionKind,
    recall_transcript: input.recallTranscript ?? null,
    groq_model: input.groqModel ?? null,
    groq_feedback: input.groqFeedback ?? null,
    confidence_stars: input.confidenceStars ?? null,
    suggested_next_review_date: input.suggestedNextReviewDate ?? null,
    next_review_effective_date: input.nextReviewEffectiveDate ?? null,
    user_overrode_next_review: input.userOverrodeNextReview ?? false,
  };

  const { data, error } = await supabase
    .from("user_revision_logs")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: USER_ERROR.tryAgain };
  }

  const shouldUpsertState =
    Boolean(input.syllabusMasterId) &&
    (input.sessionKind === "active_recall_typed" ||
      input.sessionKind === "active_recall_voice" ||
      input.sessionKind === "confidence_only" ||
      input.sessionKind === "next_review_scheduled") &&
    Boolean(input.nextReviewEffectiveDate);

  if (shouldUpsertState && input.syllabusMasterId && input.nextReviewEffectiveDate) {
    const [minD, maxD] =
      input.confidenceStars != null && input.confidenceStars >= 1
        ? suggestIntervalRangeForStars(input.confidenceStars)
        : [null, null] as [number | null, number | null];

    const { error: stErr } = await supabase.from("user_revision_topic_state").upsert(
      {
        user_id: user.id,
        syllabus_master_id: input.syllabusMasterId,
        topic_title: title,
        next_review_effective_date: input.nextReviewEffectiveDate,
        last_confidence_stars: input.confidenceStars ?? null,
        last_recalled_at: new Date().toISOString(),
        last_suggested_interval_min: minD ?? null,
        last_suggested_interval_max: maxD ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,syllabus_master_id" },
    );

    if (stErr) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }
  }

  return { ok: true, id: data.id };
}

/**
 * After user overrides next review only — updates topic state and logs.
 */
export async function overrideNextReviewDate(params: {
  syllabusMasterId: string;
  topicTitle: string;
  effectiveDate: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in." };
  }

  const t = (params.topicTitle ?? "").trim();
  if (!t) return { ok: false, error: USER_ERROR.tryAgain };

  const { error } = await supabase.from("user_revision_topic_state").upsert({
    user_id: user.id,
    syllabus_master_id: params.syllabusMasterId,
    topic_title: t,
    next_review_effective_date: params.effectiveDate,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: USER_ERROR.tryAgain };
  }

  const { error: logErr } = await supabase.from("user_revision_logs").insert({
    user_id: user.id,
    syllabus_master_id: params.syllabusMasterId,
    topic_title: t,
    session_kind: "next_review_scheduled",
    user_overrode_next_review: true,
    next_review_effective_date: params.effectiveDate,
    suggested_next_review_date: params.effectiveDate,
  });

  if (logErr) {
    return { ok: false, error: USER_ERROR.tryAgain };
  }

  return { ok: true };
}
