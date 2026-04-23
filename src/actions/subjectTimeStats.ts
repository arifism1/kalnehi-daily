"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SubjectTimeStat = {
  subject: string;
  totalSeconds: number;
};

export type SubjectTimeRange = "week" | "month" | "all";

function rangeStartDate(range: SubjectTimeRange): string | null {
  if (range === "all") return null;
  const d = new Date();
  if (range === "week") d.setDate(d.getDate() - 7);
  if (range === "month") d.setDate(d.getDate() - 30);
  return d.toISOString();
}

export async function getSubjectTimeDistribution(
  range: SubjectTimeRange = "month",
): Promise<{ ok: true; data: SubjectTimeStat[] } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const since = rangeStartDate(range);

    // Join task_sessions → tasks → syllabus_master to aggregate seconds per subject.
    let query = supabase
      .from("task_sessions")
      .select("duration_seconds, tasks!inner(user_id, syllabus_master!inner(subject))")
      .eq("tasks.user_id", user.id);

    if (since) {
      query = query.gte("start_time", since);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    // Aggregate client-side from the nested response
    const totals = new Map<string, number>();
    for (const session of data ?? []) {
      const task = (session as { tasks?: { syllabus_master?: { subject?: string } | null } | null }).tasks;
      const subject = task?.syllabus_master?.subject;
      if (!subject || !session.duration_seconds) continue;
      totals.set(subject, (totals.get(subject) ?? 0) + session.duration_seconds);
    }

    const stats: SubjectTimeStat[] = Array.from(totals.entries())
      .map(([subject, totalSeconds]) => ({ subject, totalSeconds }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    return { ok: true, data: stats };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
