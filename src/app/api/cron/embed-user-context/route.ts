import { type NextRequest, NextResponse } from "next/server";

import { createRouteLogger } from "@/lib/logger";
import {
  createPrepbrainEmbedding,
  PREPBRAIN_EMBEDDING_DIM,
  upsertPrepbrainEmbedding,
} from "@/lib/prepbrainEmbeddings";
import { asUntypedServiceRole } from "@/lib/supabase/serviceRoleUntyped";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 300;

const log = createRouteLogger("cron/embed-user-context");
const LOOKBACK_DAYS = 7;
const MAX_USERS_PER_RUN = 40;
const MAX_ROWS_PER_USER = 12;

/**
 * Hourly cron: embed recent study sessions and daily reflections for active users.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DEEPINFRA_API_KEY?.trim()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_deepinfra_key" });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();

  const { data: sessionUsers } = await admin
    .from("study_sessions")
    .select("user_id")
    .gte("ended_at", since)
    .limit(500);

  const userIds = [
    ...new Set((sessionUsers ?? []).map((r) => r.user_id as string)),
  ].slice(0, MAX_USERS_PER_RUN);

  let embedded = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const { data: sessions } = await admin
      .from("study_sessions")
      .select("id, subject, duration_seconds, is_camera_proven, ended_at")
      .eq("user_id", userId)
      .gte("ended_at", since)
      .order("ended_at", { ascending: false })
      .limit(MAX_ROWS_PER_USER);

    for (const s of sessions ?? []) {
      const content = `Study session: ${s.subject}, ${Math.round((s.duration_seconds as number) / 60)} min, camera proven: ${s.is_camera_proven}`;
      const sourceId = String(s.id);
      const sourceUpdatedAt = String(s.ended_at);

      const { data: existing } = await asUntypedServiceRole(admin)
        .from("prepbrain_embeddings")
        .select("id, source_updated_at")
        .eq("user_id", userId)
        .eq("source_type", "study_session")
        .eq("source_id", sourceId)
        .maybeSingle();

      if (
        existing?.source_updated_at &&
        sourceUpdatedAt <= String(existing.source_updated_at)
      ) {
        skipped += 1;
        continue;
      }

      const vec = await createPrepbrainEmbedding(content);
      if (!vec || vec.length !== PREPBRAIN_EMBEDDING_DIM) {
        skipped += 1;
        continue;
      }

      await upsertPrepbrainEmbedding(admin, {
        userId,
        sourceType: "study_session",
        sourceId,
        content,
        embedding: vec,
        sourceUpdatedAt,
      });
      embedded += 1;
    }

    const { data: reflections } = await admin
      .from("daily_reflections")
      .select("id, reflection_date, finished_today, skipped_today, tomorrow_priority, updated_at")
      .eq("user_id", userId)
      .gte("reflection_date", since.slice(0, 10))
      .order("reflection_date", { ascending: false })
      .limit(5);

    for (const r of reflections ?? []) {
      const content = [
        `Reflection ${r.reflection_date}:`,
        r.finished_today ? `Finished: ${r.finished_today}` : null,
        r.skipped_today ? `Skipped: ${r.skipped_today}` : null,
        r.tomorrow_priority ? `Tomorrow: ${r.tomorrow_priority}` : null,
      ]
        .filter(Boolean)
        .join(" ");
      if (!content.trim()) continue;

      const sourceId = String(r.id);
      const sourceUpdatedAt = String(r.updated_at);

      const { data: existing } = await asUntypedServiceRole(admin)
        .from("prepbrain_embeddings")
        .select("id, source_updated_at")
        .eq("user_id", userId)
        .eq("source_type", "daily_reflection")
        .eq("source_id", sourceId)
        .maybeSingle();

      if (
        existing?.source_updated_at &&
        sourceUpdatedAt <= String(existing.source_updated_at)
      ) {
        skipped += 1;
        continue;
      }

      const vec = await createPrepbrainEmbedding(content);
      if (!vec || vec.length !== PREPBRAIN_EMBEDDING_DIM) {
        skipped += 1;
        continue;
      }

      await upsertPrepbrainEmbedding(admin, {
        userId,
        sourceType: "daily_reflection",
        sourceId,
        content,
        embedding: vec,
        sourceUpdatedAt,
      });
      embedded += 1;
    }
  }

  log.info("run complete", { users: userIds.length, embedded, skipped });

  return NextResponse.json({
    ok: true,
    users: userIds.length,
    embedded,
    skipped,
  });
}
