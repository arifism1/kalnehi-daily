/**
 * Vercel Cron — refreshes per-user weekly cohort metrics and recomputes top_percent.
 * Secured with CRON_SECRET.
 */
import { type NextRequest, NextResponse } from "next/server";

import { loadSyllabusDataForUser, cohortKeyForLeaderboard } from "@/lib/syllabusDataForUser";
import { computeSyllabusRollup } from "@/lib/syllabusRollup";
import { isNeetUgExam } from "@/lib/examProfile";
import { getIstWeekBounds } from "@/lib/istWeek";
import { computeLeaderboardComposite } from "@/lib/leaderboardComposite";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { sumTaskSessionSecondsInRange } from "@/lib/sumTaskSessionSecondsInRange";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 300;

const PAGE = 200;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const { weekStartInstant, weekEndExclusive, weekStartDate } = getIstWeekBounds();
  const startIso = weekStartInstant.toISOString();
  const endIso = weekEndExclusive.toISOString();

  let lastUserId: string | null = null;
  let processed = 0;
  let upserted = 0;
  let skipped = 0;
  let deleted = 0;
  let errorCount = 0;
  const errorSamples: string[] = [];

  for (;;) {
    // Keyset pagination: avoids offset skew when rows are inserted during the cron run.
    let query = admin
      .from("user_profiles")
      .select("user_id")
      .order("user_id", { ascending: true })
      .limit(PAGE);

    if (lastUserId !== null) {
      query = query.gt("user_id", lastUserId);
    }

    const { data: page, error: pageErr } = await query;

    if (pageErr) {
      console.error("[cron/refresh-leaderboard-snapshots] page", pageErr);
      return NextResponse.json(
        { ok: false, error: "Failed to list profiles." },
        { status: 500 },
      );
    }

    if (!page?.length) break;

    for (const row of page) {
      const userId = row.user_id;
      if (!userId) continue;
      processed += 1;
      try {
        const syl = await loadSyllabusDataForUser(admin, userId);
        const cohort = cohortKeyForLeaderboard(syl);
        if (!cohort) {
          // Delete any existing snapshot for this week so stale data doesn't
          // corrupt the leaderboard when the user has no valid cohort.
          const { error: delErr } = await admin
            .from("leaderboard_weekly_metrics")
            .delete()
            .eq("user_id", userId)
            .eq("week_start", weekStartDate);
          if (delErr) {
            console.error("[cron/refresh-leaderboard-snapshots] stale-delete", userId, delErr);
          } else {
            deleted += 1;
          }
          skipped += 1;
          continue;
        }
        const rollup = computeSyllabusRollup(
          syl.rows,
          syl.statusBySyllabusMasterId,
          syl.primaryMarksYear,
          isNeetUgExam(syl.examLabel)
            ? { legacyMarksSkipYears: [2026] }
            : undefined,
        );
        const weeklySeconds = await sumTaskSessionSecondsInRange(
          admin,
          userId,
          startIso,
          endIso,
        );
        const weeklyHours = weeklySeconds / 3600;
        const composite = computeLeaderboardComposite(
          weeklyHours,
          rollup.overallPercent,
        );
        const { error: upErr } = await admin.from("leaderboard_weekly_metrics").upsert(
          {
            user_id: userId,
            week_start: weekStartDate,
            cohort_key: cohort,
            weekly_seconds: weeklySeconds,
            syllabus_overall_pct: rollup.overallPercent,
            composite,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,week_start" },
        );
        if (upErr) throw upErr;
        upserted += 1;
      } catch (e) {
        errorCount += 1;
        const msg = e instanceof Error ? e.message : String(e);
        if (errorSamples.length < 8) {
          errorSamples.push(`${userId}: ${msg}`);
        }
        console.error("[cron/refresh-leaderboard-snapshots] user", userId, e);
      }
    }

    // Advance cursor for next page.
    const lastRow = page[page.length - 1];
    lastUserId = lastRow?.user_id ?? null;

    if (page.length < PAGE) break;
  }

  const { error: rpcErr } = await admin.rpc("recompute_leaderboard_weekly_top_percents", {
    p_week_start: weekStartDate,
  });
  if (rpcErr) {
    console.error("[cron/refresh-leaderboard-snapshots] recompute", rpcErr);
    return NextResponse.json(
      {
        ok: false,
        error: "Recompute failed.",
        processed,
        upserted,
        skipped,
        deleted,
        error_count: errorCount,
        error_samples: errorSamples.length ? errorSamples : undefined,
      },
      { status: 500 },
    );
  }

  console.log(
    "[cron/refresh-leaderboard-snapshots] week=%s processed=%d upserted=%d skipped=%d deleted=%d errors=%d",
    weekStartDate,
    processed,
    upserted,
    skipped,
    deleted,
    errorCount,
  );

  // Return 207 when some users failed so callers can distinguish full success
  // from partial failures without losing the full response body.
  const status = errorCount > 0 ? 207 : 200;
  return NextResponse.json(
    {
      ok: errorCount === 0,
      week_start: weekStartDate,
      processed,
      upserted,
      skipped,
      deleted,
      error_count: errorCount,
      error_samples: errorSamples.length ? errorSamples : undefined,
    },
    { status },
  );
}
