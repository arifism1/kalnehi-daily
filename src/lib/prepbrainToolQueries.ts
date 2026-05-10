import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseCuetDomainSubjectsJson,
  syllabusSubjectInCuetDomains,
} from "@/lib/cuetDomainSubjects";
import { syllabusCatalogExamName } from "@/lib/examProfile";
import { fetchSyllabusMasterRowsForExam } from "@/lib/syllabusMasterQuery";
import { resolvePrepbrainExamLabels } from "@/lib/syllabusDataForUser";
import type { Database } from "@/types/supabase";

/** Minimal profile shape used by syllabus/marks tool queries. Pass this in to avoid a redundant DB round-trip. */
export type PrepbrainPrefetchedProfile = {
  primary_exam?: string | null;
  target_exam?: string | null;
  selected_track?: string | null;
  enabled_exams_in_track?: unknown;
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
  marks_2026: number;
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

export type SyllabusSubjectCompletionExam = {
  exam_label: string;
  overall_completion_percent: number;
  by_subject: Array<{
    subject: string;
    completion_percent: number;
    done: number;
    total: number;
  }>;
};

/** One entry per enabled / track exam (same order as the Syllabus Tracker). */
export type SyllabusSubjectCompletionPayload = {
  exams: SyllabusSubjectCompletionExam[];
};

async function syllabusSubjectCompletionForExamLabel(
  admin: AdminClient,
  userId: string,
  examLabel: string,
  profile: PrepbrainPrefetchedProfile | null,
): Promise<SyllabusSubjectCompletionExam> {
  const examKey = syllabusCatalogExamName(examLabel);
  if (!examKey) {
    return { exam_label: examLabel, overall_completion_percent: 0, by_subject: [] };
  }

  const upscOptional = Array.isArray(profile?.upsc_optional_subjects)
    ? (profile.upsc_optional_subjects[0]?.trim() || null)
    : null;

  const fullRows = await fetchSyllabusMasterRowsForExam(admin, examKey, upscOptional);
  const syllabusRows = fullRows.map((r) => ({
    id: r.id,
    subject: r.subject,
  }));

  const domains = parseCuetDomainSubjectsJson(profile?.cuet_domain_subjects ?? null);
  const filtered =
    examKey === "CUET" && domains.length > 0
      ? syllabusRows.filter((r) => syllabusSubjectInCuetDomains(r.subject, domains))
      : examKey === "CUET"
        ? []
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

export async function fetchSyllabusSubjectCompletion(
  admin: AdminClient,
  userId: string,
  prefetchedProfile?: PrepbrainPrefetchedProfile,
): Promise<SyllabusSubjectCompletionPayload> {
  let profile: PrepbrainPrefetchedProfile | null = prefetchedProfile ?? null;
  if (!profile) {
    const { data, error: profileErr } = await admin
      .from("user_profiles")
      .select(
        "primary_exam, target_exam, selected_track, enabled_exams_in_track, cuet_domain_subjects, upsc_optional_subjects",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (profileErr) throw profileErr;
    profile = data ?? null;
  }

  const labels = resolvePrepbrainExamLabels(profile);
  if (labels.length === 0) {
    return {
      exams: [
        {
          exam_label: "Exam preparation",
          overall_completion_percent: 0,
          by_subject: [],
        },
      ],
    };
  }

  const exams = await Promise.all(
    labels.map((label) => syllabusSubjectCompletionForExamLabel(admin, userId, label, profile)),
  );
  return { exams };
}

export async function getTodayPlan(admin: AdminClient, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("tasks")
    .select("status, name, estimated_time_minutes, marks_weight")
    .eq("user_id", userId)
    .eq("assigned_date", today)
    .limit(300);
  if (error) throw error;
  const rows = data ?? [];
  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const completion_percent = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
  const planned_minutes = rows.reduce(
    (sum, r) => sum + Math.max(0, r.estimated_time_minutes ?? 0),
    0,
  );
  const task_items = rows.map((r) => {
    const est = Math.max(0, r.estimated_time_minutes ?? 0);
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
  const stats = prefetchedStats ?? (await fetchSyllabusSubjectCompletion(admin, userId, prefetchedProfile));
  return {
    exams: stats.exams.map((e) => ({
      exam: e.exam_label,
      overall_completion_percent: e.overall_completion_percent,
      subjects_covered: e.by_subject.length,
    })),
  };
}

export async function getWeakStrongSubjects(
  admin: AdminClient,
  userId: string,
  prefetchedProfile?: PrepbrainPrefetchedProfile,
  prefetchedStats?: Awaited<ReturnType<typeof fetchSyllabusSubjectCompletion>>,
) {
  const stats = prefetchedStats ?? (await fetchSyllabusSubjectCompletion(admin, userId, prefetchedProfile));
  return {
    exams: stats.exams.map((e) => {
      const strong = e.by_subject.slice(0, 3).map((s) => ({
        subject: s.subject,
        completion_percent: s.completion_percent,
        topics_remaining: s.total - s.done,
      }));
      const weak = [...e.by_subject]
        .sort((a, b) => a.completion_percent - b.completion_percent)
        .slice(0, 3)
        .map((s) => ({
          subject: s.subject,
          completion_percent: s.completion_percent,
          topics_remaining: s.total - s.done,
        }));
      return { exam: e.exam_label, weak_top_3: weak, strong_top_3: strong };
    }),
  };
}

export async function getMissedTasksContext(admin: AdminClient, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const since = ymdDaysAgo(6);
  const { data, error } = await admin
    .from("tasks")
    .select("status, assigned_date")
    .eq("user_id", userId)
    .lt("assigned_date", today)
    .gte("assigned_date", since)
    .limit(300);
  if (error) throw error;
  const rows = data ?? [];
  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const missed = total - completed;
  const execution_rate_percent =
    total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
  return {
    missed_tasks_last_7d: missed,
    completed_tasks_last_7d: completed,
    total_tasks_last_7d: total,
    execution_rate_percent,
  };
}

export async function getRevisionQueueSnapshot(admin: AdminClient, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("user_revision_queue_items")
    .select("next_due, status")
    .eq("user_id", userId)
    .eq("status", "pending")
    .limit(200);
  if (error) throw error;
  const rows = data ?? [];
  const overdue_count = rows.filter((r) => r.next_due < today).length;
  const due_today = rows.filter((r) => r.next_due === today).length;
  return {
    total_pending: rows.length,
    overdue_count,
    due_today,
  };
}

export async function getLatestMockScores(admin: AdminClient, userId: string) {
  const { data: tests, error: testErr } = await admin
    .from("mock_tests")
    .select("id, test_name, test_date, exam_name, total_score, max_score, self_rating")
    .eq("user_id", userId)
    .order("test_date", { ascending: false })
    .limit(3);
  if (testErr) throw testErr;
  const testRows = tests ?? [];
  if (testRows.length === 0) return null;

  const testIds = testRows.map((t) => t.id);
  const { data: scoresData, error: scoresErr } = await admin
    .from("mock_test_subject_scores")
    .select("mock_test_id, subject, score, max_score")
    .in("mock_test_id", testIds);
  if (scoresErr) throw scoresErr;

  const scoresMap = new Map<
    string,
    Array<{ subject: string; score: number | null; max_score: number | null }>
  >();
  for (const s of scoresData ?? []) {
    const arr = scoresMap.get(s.mock_test_id) ?? [];
    arr.push({ subject: s.subject, score: s.score, max_score: s.max_score });
    scoresMap.set(s.mock_test_id, arr);
  }

  return {
    recent_tests: testRows.map((t) => ({
      test_name: t.test_name,
      test_date: t.test_date,
      exam_name: t.exam_name,
      total_score: t.total_score,
      max_score: t.max_score,
      self_rating: t.self_rating,
      subject_scores: scoresMap.get(t.id) ?? [],
    })),
  };
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
      .select("primary_exam, target_exam, selected_track, enabled_exams_in_track")
      .eq("user_id", userId)
      .maybeSingle();
    profile = data ?? null;
  }

  const labels = resolvePrepbrainExamLabels(profile ?? null);
  if (labels.length === 0) return null;

  const n = labels.length;
  const perLimit = n <= 1 ? limit : Math.max(4, Math.floor(limit / n));

  const rpc = admin as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };

  const exams = await Promise.all(
    labels.map(async (examLabel) => {
      const examKey = syllabusCatalogExamName(examLabel);
      if (!examKey) {
        return {
          exam: examLabel,
          note: "approx marks from past-year catalog; not official",
          marks_rows: [] as MarksIntelligenceRow[],
        };
      }
      const { data, error } = await rpc.rpc("prepbrain_marks_intelligence", {
        p_user_id: userId,
        p_exam_name: examKey,
        p_limit: perLimit,
      });
      if (error || !Array.isArray(data) || data.length === 0) {
        return {
          exam: examLabel,
          note: "approx marks from past-year catalog; not official",
          marks_rows: [] as MarksIntelligenceRow[],
        };
      }
      return {
        exam: examLabel,
        note: "approx marks from past-year catalog; not official",
        marks_rows: data as MarksIntelligenceRow[],
      };
    }),
  );

  const anyRows = exams.some((e) => e.marks_rows.length > 0);
  if (!anyRows) return null;

  return { exams };
}

export async function getSyllabusBacklogSnapshot(admin: AdminClient, userId: string) {
  const todayYmd = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: rows }] = await Promise.all([
    admin
      .from("user_profiles")
      .select("target_exam_date")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("user_syllabus_backlog")
      .select("id, title, status, group_label, effort_estimate_minutes, retry_count, created_at, last_attempt_date")
      .eq("user_id", userId)
      .in("status", ["pending", "scheduled", "draft"])
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  let days_until_exam: number | null = null;
  const raw = profile?.target_exam_date?.trim();
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const exam = new Date(`${raw}T00:00:00`);
    const now = new Date();
    const ms = exam.getTime() - now.getTime();
    days_until_exam = ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
  }

  const list = (rows ?? []).map((r) => {
    let days_since_last_attempt: number | null = null;
    if (r.last_attempt_date && /^\d{4}-\d{2}-\d{2}$/.test(r.last_attempt_date)) {
      const diff = new Date(todayYmd).getTime() - new Date(r.last_attempt_date).getTime();
      days_since_last_attempt = Math.max(0, Math.round(diff / (24 * 60 * 60 * 1000)));
    }
    return {
      title: r.title,
      status: r.status,
      group: r.group_label,
      effort_min: r.effort_estimate_minutes,
      retries: r.retry_count ?? 0,
      days_since_last_attempt,
    };
  });

  return {
    days_until_exam,
    backlog_items: list,
    note: "Use with marks + syllabus tools for phased recovery; no calendar invention.",
  };
}

export async function getDailyDebriefSnapshot(admin: AdminClient, userId: string) {
  const since = ymdDaysAgo(6);
  const { data, error } = await admin
    .from("daily_reflections")
    .select("reflection_date, skipped_today, finished_today, tomorrow_priority")
    .eq("user_id", userId)
    .gte("reflection_date", since)
    .order("reflection_date", { ascending: false })
    .limit(7);
  if (error) throw error;
  const entries = (data ?? []).map((r) => ({
    date: r.reflection_date,
    skipped_today: r.skipped_today ?? null,
    finished_today: r.finished_today ?? null,
    tomorrow_priority: r.tomorrow_priority ?? null,
  }));
  return { debrief_entries: entries };
}

export async function getMockTrendBySubject(admin: AdminClient, userId: string) {
  const { data: tests, error: testErr } = await admin
    .from("mock_tests")
    .select("id, test_date")
    .eq("user_id", userId)
    .order("test_date", { ascending: false })
    .limit(6);
  if (testErr) throw testErr;
  const testRows = tests ?? [];
  if (testRows.length < 2) return null;

  const testIds = testRows.map((t) => t.id);
  const { data: scoresData, error: scoresErr } = await admin
    .from("mock_test_subject_scores")
    .select("mock_test_id, subject, score, max_score")
    .in("mock_test_id", testIds);
  if (scoresErr) throw scoresErr;

  // Map test_id → date for chronological ordering
  const testDateMap = new Map(testRows.map((t) => [t.id, t.test_date]));

  // Group scores by subject, ordered oldest → newest
  const subjectScores = new Map<string, Array<{ date: string; pct: number }>>();
  for (const s of scoresData ?? []) {
    if (s.score == null || s.max_score == null || s.max_score === 0) continue;
    const date = testDateMap.get(s.mock_test_id) ?? "";
    if (!date) continue;
    const pct = Math.round((s.score / s.max_score) * 1000) / 10;
    const arr = subjectScores.get(s.subject) ?? [];
    arr.push({ date, pct });
    subjectScores.set(s.subject, arr);
  }

  const trends: Array<{ subject: string; latest_pct: number; trend: "improving" | "declining" | "flat"; data_points: number }> = [];
  for (const [subject, scores] of subjectScores) {
    if (scores.length < 2) continue;
    const sorted = scores.sort((a, b) => (a.date < b.date ? -1 : 1));
    const first = sorted[0].pct;
    const last = sorted[sorted.length - 1].pct;
    const delta = last - first;
    const trend: "improving" | "declining" | "flat" =
      delta >= 3 ? "improving" : delta <= -3 ? "declining" : "flat";
    trends.push({ subject, latest_pct: last, trend, data_points: sorted.length });
  }

  return { subject_trends: trends };
}

export async function getStudyTimerStats(admin: AdminClient, userId: string) {
  const since = ymdDaysAgo(29);
  const sinceIso = new Date(`${since}T00:00:00`).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const [sessionsRes, tasksRes] = await Promise.all([
    admin
      .from("study_sessions")
      .select("started_at, duration_seconds")
      .eq("user_id", userId)
      .gte("started_at", sinceIso)
      .limit(500),
    admin
      .from("tasks")
      .select("assigned_date, estimated_time_minutes, status")
      .eq("user_id", userId)
      .gte("assigned_date", since)
      .lt("assigned_date", today)
      .limit(500),
  ]);

  if (sessionsRes.error) throw sessionsRes.error;
  if (tasksRes.error) throw tasksRes.error;

  const sessions = sessionsRes.data ?? [];
  const totalSeconds = sessions.reduce((s, r) => s + Math.max(0, r.duration_seconds ?? 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  const studyDates = new Set(
    sessions.map((r) => r.started_at?.slice(0, 10)).filter(Boolean),
  );
  const total_study_days_last_30d = studyDates.size;
  const avg_daily_focused_minutes =
    total_study_days_last_30d > 0
      ? Math.round(totalMinutes / total_study_days_last_30d)
      : 0;

  const tasks = tasksRes.data ?? [];
  const planned_minutes = tasks.reduce(
    (s, r) => s + Math.max(0, r.estimated_time_minutes ?? 0),
    0,
  );
  const efficiency_ratio: number | null =
    planned_minutes > 0
      ? Math.round((totalMinutes / planned_minutes) * 100) / 100
      : null;

  return {
    total_study_days_last_30d,
    total_focused_minutes_last_30d: totalMinutes,
    avg_daily_focused_minutes,
    planned_minutes_last_30d: planned_minutes,
    efficiency_ratio,
  };
}

const TEXT_PREVIEW_MAX = 500;
const LETTER_BODY_MAX = 1200;

function truncateForPrepBrain(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function todayYmdUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Doubt tracker (cloud-synced rows; local-only doubts may be absent). */
export async function getDoubtsSnapshot(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("doubts")
    .select("title, description, status, subject, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  const rows = (data ?? []).map((r) => ({
    title: (r.title ?? "").trim() || "(untitled)",
    description: truncateForPrepBrain((r.description ?? "").trim(), TEXT_PREVIEW_MAX),
    status: r.status,
    subject: r.subject?.trim() || null,
    updated_at: typeof r.updated_at === "string" ? r.updated_at.slice(0, 10) : "",
  }));
  return {
    doubts: rows,
    note: "Rows sync from the Doubt Tracker when enabled; purely local doubts may not appear.",
  };
}

export async function getMistakeLogSnapshot(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("mistake_logs")
    .select(
      "subject, topic_label, mistake_type, note, flag_for_revision, logged_at, source",
    )
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  const entries = (data ?? []).map((r) => ({
    subject: (r.subject ?? "").trim() || "—",
    topic: (r.topic_label ?? "").trim() || null,
    type: (r.mistake_type ?? "").trim() || "—",
    note: r.note?.trim()
      ? truncateForPrepBrain(r.note.trim(), TEXT_PREVIEW_MAX)
      : null,
    flag_revision: Boolean(r.flag_for_revision),
    logged_at: typeof r.logged_at === "string" ? r.logged_at.slice(0, 10) : "",
    source: (r.source ?? "").trim() || null,
  }));
  return { mistakes: entries };
}

export type MotivationLetterPrepRow = {
  letter_date: string;
  pinned: boolean;
  sealed: boolean;
  open_date: string | null;
  body_excerpt: string | null;
  privacy_note: string | null;
};

/**
 * Personal Motivation: letters (respecting seal — no body until open_date), voice transcripts, vision captions.
 * Never returns image bytes or voice audio.
 */
export async function getMotivationContextSnapshot(admin: AdminClient, userId: string) {
  const today = todayYmdUtc();

  const [lettersRes, voiceRes, visionRes] = await Promise.all([
    admin
      .from("motivation_letters")
      .select("letter_date, body, sealed, open_date, pinned, created_at")
      .eq("user_id", userId)
      .order("letter_date", { ascending: false })
      .limit(8),
    admin
      .from("motivation_voice_affirmations")
      .select("transcript, tags, recorded_at")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(6),
    admin
      .from("motivation_vision_photos")
      .select("caption, photo_date, is_wallpaper, created_at")
      .eq("user_id", userId)
      .order("photo_date", { ascending: false })
      .limit(6),
  ]);

  if (lettersRes.error) throw lettersRes.error;
  if (voiceRes.error) throw voiceRes.error;
  if (visionRes.error) throw visionRes.error;

  const letters: MotivationLetterPrepRow[] = (lettersRes.data ?? []).map((row) => {
    const sealed = Boolean(row.sealed);
    const openDate = row.open_date?.trim() || null;
    let body_excerpt: string | null = null;
    let privacy_note: string | null = null;
    if (!sealed) {
      body_excerpt = truncateForPrepBrain((row.body ?? "").trim(), LETTER_BODY_MAX) || null;
    } else if (openDate && openDate <= today) {
      body_excerpt = truncateForPrepBrain((row.body ?? "").trim(), LETTER_BODY_MAX) || null;
    } else {
      privacy_note = openDate
        ? `Sealed letter — body hidden until ${openDate} (not shown to Mastermind before then).`
        : "Sealed letter — body hidden until open date (not shown to Mastermind).";
    }
    return {
      letter_date: row.letter_date ?? "",
      pinned: Boolean(row.pinned),
      sealed,
      open_date: openDate,
      body_excerpt,
      privacy_note,
    };
  });

  const voice_affirmations = (voiceRes.data ?? []).map((r) => ({
    recorded_at:
      typeof r.recorded_at === "string" ? r.recorded_at.slice(0, 10) : "",
    tags: Array.isArray(r.tags) ? r.tags.slice(0, 8) : [],
    transcript: truncateForPrepBrain((r.transcript ?? "").trim(), TEXT_PREVIEW_MAX),
  }));

  const vision_captions = (visionRes.data ?? []).map((r) => ({
    photo_date: r.photo_date ?? "",
    is_wallpaper: Boolean(r.is_wallpaper),
    caption: r.caption?.trim()
      ? truncateForPrepBrain(r.caption.trim(), 240)
      : null,
    note: "Wallpaper / vision image stored in app — Mastermind sees caption only.",
  }));

  return {
    letters,
    voice_affirmations,
    vision_captions,
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
  | "getMarksIntelligence"
  | "getMissedTasksContext"
  | "getRevisionQueueSnapshot"
  | "getLatestMockScores"
  | "getSyllabusBacklogSnapshot"
  | "getDailyDebriefSnapshot"
  | "getMockTrendBySubject"
  | "getStudyTimerStats"
  | "getDoubtsSnapshot"
  | "getMistakeLogSnapshot"
  | "getMotivationContextSnapshot";

