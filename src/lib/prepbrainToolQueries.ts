import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseCuetDomainSubjectsJson,
  syllabusSubjectInCuetDomains,
} from "@/lib/cuetDomainSubjects";
import {
  resolveSyllabusExam,
  syllabusCatalogExamName,
} from "@/lib/examProfile";
import { fetchSyllabusMasterRowsForExam } from "@/lib/syllabusMasterQuery";
import type { Database } from "@/types/supabase";

/** Minimal profile shape used by syllabus/marks tool queries. Pass this in to avoid a redundant DB round-trip. */
export type PrepbrainPrefetchedProfile = {
  primary_exam?: string | null;
  target_exam?: string | null;
  /** Stored as JSON in Supabase — `parseCuetDomainSubjectsJson` handles all shapes. */
  cuet_domain_subjects?: unknown;
  /** First optional paper base name for UPSC CSE Mains RPC parity. */
  upsc_optional_subjects?: unknown;
};

/** Raw rows from `prepbrain_marks_intelligence` RPC — used for Markdown serialization. */
export type MarksIntelligenceRow = {
  subject: string;
  chapter: string;
  marks_2023: number;
  marks_2024: number;
  marks_2025: number;
  total_topics: number;
  done_topics: number;
  completion_pct: number;
};

type AdminClient = SupabaseClient<Database>;

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function uniqueSortedDates(descDates: string[]): string[] {
  return [...new Set(descDates)].sort((a, b) => (a < b ? 1 : -1));
}

function computeDateStreakFromToday(completedDatesDesc: string[]): number {
  if (completedDatesDesc.length === 0) return 0;
  const dates = uniqueSortedDates(completedDatesDesc);
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < dates.length; i++) {
    const probe = new Date(today);
    probe.setDate(today.getDate() - i);
    const ymd = probe.toISOString().slice(0, 10);
    if (dates[i] === ymd) streak++;
    else break;
  }
  return streak;
}

export async function fetchSyllabusSubjectCompletion(
  admin: AdminClient,
  userId: string,
  prefetchedProfile?: PrepbrainPrefetchedProfile,
): Promise<{
  exam_label: string;
  overall_completion_percent: number;
  by_subject: Array<{ subject: string; completion_percent: number; done: number; total: number }>;
}> {
  let profile: PrepbrainPrefetchedProfile | null = prefetchedProfile ?? null;
  if (!profile) {
    const { data, error: profileErr } = await admin
      .from("user_profiles")
      .select("primary_exam, target_exam, cuet_domain_subjects, upsc_optional_subjects")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileErr) throw profileErr;
    profile = data ?? null;
  }

  const examLabel = resolveSyllabusExam(profile ?? null) ?? "Exam preparation";
  const examKey = syllabusCatalogExamName(examLabel);
  if (!examKey) {
    return { exam_label: examLabel, overall_completion_percent: 0, by_subject: [] };
  }

  const upscOptional = Array.isArray(profile?.upsc_optional_subjects)
    ? (profile.upsc_optional_subjects[0]?.trim() || null)
    : null;

  const fullRows = await fetchSyllabusMasterRowsForExam(
    admin,
    examKey,
    upscOptional,
  );
  const syllabusRows = fullRows.map((r) => ({
    id: r.id,
    subject: r.subject,
  }));

  const domains = parseCuetDomainSubjectsJson(profile?.cuet_domain_subjects ?? null);
  const filtered =
    examKey === "CUET" && domains.length > 0
      ? syllabusRows.filter((r) =>
          syllabusSubjectInCuetDomains(r.subject, domains),
        )
      : syllabusRows;

  if (filtered.length === 0) {
    return { exam_label: examLabel, overall_completion_percent: 0, by_subject: [] };
  }

  const syllabusIds = filtered.map((r) => r.id);
  const { data: progressRows, error: progErr } = await admin
    .from("user_microtopic_progress")
    .select("syllabus_master_id, status")
    .eq("user_id", userId)
    .in("syllabus_master_id", syllabusIds);
  if (progErr) throw progErr;

  const doneSet = new Set(
    (progressRows ?? [])
      .filter((r) => r.status === "completed")
      .map((r) => r.syllabus_master_id),
  );

  const bySubjectMap = new Map<string, { done: number; total: number }>();
  for (const row of filtered) {
    const key = row.subject?.trim() || "General";
    const current = bySubjectMap.get(key) ?? { done: 0, total: 0 };
    current.total += 1;
    if (doneSet.has(row.id)) current.done += 1;
    bySubjectMap.set(key, current);
  }

  const by_subject = [...bySubjectMap.entries()]
    .map(([subject, stats]) => ({
      subject,
      done: stats.done,
      total: stats.total,
      completion_percent:
        stats.total > 0 ? Math.round((stats.done / stats.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.completion_percent - a.completion_percent);

  const totalDone = by_subject.reduce((s, r) => s + r.done, 0);
  const totalAll = by_subject.reduce((s, r) => s + r.total, 0);
  const overall_completion_percent =
    totalAll > 0 ? Math.round((totalDone / totalAll) * 1000) / 10 : 0;

  return { exam_label: examLabel, overall_completion_percent, by_subject };
}

export async function getTodayPlan(admin: AdminClient, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("tasks")
    .select("status, name, estimated_minutes, estimated_time_minutes, marks_weight")
    .eq("user_id", userId)
    .eq("assigned_date", today)
    .limit(300);
  if (error) throw error;
  const rows = data ?? [];
  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const completion_percent = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
  const planned_minutes = rows.reduce(
    (sum, r) => sum + Math.max(0, r.estimated_minutes ?? r.estimated_time_minutes ?? 0),
    0,
  );
  const task_items = rows.map((r) => {
    const est = Math.max(0, r.estimated_minutes ?? r.estimated_time_minutes ?? 0);
    const name = r.name?.trim() || "Task";
    return {
      status: r.status,
      name,
      marks_weight: r.marks_weight,
      estimated_minutes: est,
    };
  });
  return {
    date: today,
    tasks_total: total,
    tasks_completed: completed,
    completion_percent,
    planned_minutes,
    task_items,
  };
}

export async function getSyllabusOverview(
  admin: AdminClient,
  userId: string,
  prefetchedProfile?: PrepbrainPrefetchedProfile,
  prefetchedStats?: Awaited<ReturnType<typeof fetchSyllabusSubjectCompletion>>,
) {
  const stats = prefetchedStats ?? await fetchSyllabusSubjectCompletion(admin, userId, prefetchedProfile);
  return {
    exam: stats.exam_label,
    overall_completion_percent: stats.overall_completion_percent,
    subjects_covered: stats.by_subject.length,
  };
}

export async function getWeakStrongSubjects(
  admin: AdminClient,
  userId: string,
  prefetchedProfile?: PrepbrainPrefetchedProfile,
  prefetchedStats?: Awaited<ReturnType<typeof fetchSyllabusSubjectCompletion>>,
) {
  const stats = prefetchedStats ?? await fetchSyllabusSubjectCompletion(admin, userId, prefetchedProfile);
  const strong = stats.by_subject.slice(0, 3).map((s) => ({
    subject: s.subject,
    completion_percent: s.completion_percent,
  }));
  const weak = [...stats.by_subject]
    .sort((a, b) => a.completion_percent - b.completion_percent)
    .slice(0, 3)
    .map((s) => ({
      subject: s.subject,
      completion_percent: s.completion_percent,
    }));
  return { weak_top_3: weak, strong_top_3: strong };
}

export async function getHabitStreakSummary(admin: AdminClient, userId: string) {
  const since = ymdDaysAgo(13);
  const [habitsRes, logsRes] = await Promise.all([
    admin.from("user_habits").select("id, name").eq("user_id", userId).limit(20),
    admin
      .from("habit_logs")
      .select("log_date, completed")
      .eq("user_id", userId)
      .gte("log_date", since),
  ]);
  if (habitsRes.error) throw habitsRes.error;
  if (logsRes.error) throw logsRes.error;
  const logs = logsRes.data ?? [];
  const completedDates = logs.filter((l) => l.completed).map((l) => l.log_date);
  const streak_days = computeDateStreakFromToday(completedDates);
  return {
    habits_count: (habitsRes.data ?? []).length,
    completed_logs_last_14d: completedDates.length,
    streak_days,
  };
}

export async function getMeditationConsistency(admin: AdminClient, userId: string) {
  const since = ymdDaysAgo(29);
  const { data, error } = await admin
    .from("meditation_sessions")
    .select("date, duration_minutes")
    .eq("user_id", userId)
    .gte("date", since);
  if (error) throw error;
  const rows = data ?? [];
  const dates = rows.map((r) => r.date);
  const distinct_days = new Set(dates).size;
  const streak_days = computeDateStreakFromToday(dates);
  const total_minutes = rows.reduce(
    (sum, r) => sum + Math.max(0, r.duration_minutes ?? 0),
    0,
  );
  return {
    sessions_last_30d: rows.length,
    distinct_days_last_30d: distinct_days,
    streak_days,
    total_minutes_last_30d: total_minutes,
  };
}

export async function getRecentStudyCameraData(admin: AdminClient, userId: string) {
  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("study_sessions")
    .select("duration_seconds, is_camera_proven")
    .eq("user_id", userId)
    .gte("started_at", sinceIso)
    .limit(300);
  if (error) throw error;
  const rows = data ?? [];
  const total = rows.length;
  const camera = rows.filter((r) => r.is_camera_proven).length;
  const minutes = Math.round(
    rows.reduce((sum, r) => sum + Math.max(0, r.duration_seconds ?? 0), 0) / 60,
  );
  return {
    sessions_last_7d: total,
    camera_proven_sessions_last_7d: camera,
    camera_proven_rate_percent: total > 0 ? Math.round((camera / total) * 1000) / 10 : 0,
    total_minutes_last_7d: minutes,
  };
}

export async function getTargetScoreBlueprint(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("user_target_blueprints")
    .select(
      "exam_name, mode, target_clamped, range_low, range_high, estimated_marks_at_save, total_marks_covered, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    exam: data.exam_name,
    mode: data.mode,
    target_score: data.target_clamped,
    estimated_at_save: data.estimated_marks_at_save,
    range_low: data.range_low,
    range_high: data.range_high,
    marks_covered: data.total_marks_covered,
    saved_at: data.created_at,
  };
}

export async function getMarksIntelligence(
  admin: AdminClient,
  userId: string,
  prefetchedProfile?: PrepbrainPrefetchedProfile,
  /** Row limit for the marks intelligence RPC. Use 6 for concise mode, 10 for deep. */
  limit = 10,
) {
  let profile: PrepbrainPrefetchedProfile | null = prefetchedProfile ?? null;
  if (!profile) {
    const { data } = await admin
      .from("user_profiles")
      .select("primary_exam, target_exam")
      .eq("user_id", userId)
      .maybeSingle();
    profile = data ?? null;
  }

  const examLabel = resolveSyllabusExam(profile ?? null) ?? null;
  const examKey = examLabel ? syllabusCatalogExamName(examLabel) : null;
  if (!examKey) return null;

  // Cast required until supabase types are regenerated after migration is applied.
  const { data, error } = await (admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc(
    "prepbrain_marks_intelligence",
    { p_user_id: userId, p_exam_name: examKey, p_limit: limit },
  );
  if (error || !Array.isArray(data) || data.length === 0) return null;

  const marks_rows = data as MarksIntelligenceRow[];

  return {
    exam: examLabel,
    note: "approx marks from past-year catalog; not official",
    marks_rows,
  };
}

export type PrepbrainToolName =
  | "getTodayPlan"
  | "getSyllabusOverview"
  | "getWeakStrongSubjects"
  | "getHabitStreakSummary"
  | "getMeditationConsistency"
  | "getRecentStudyCameraData"
  | "getTargetScoreBlueprint"
  | "getMarksIntelligence";

