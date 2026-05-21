import { JourneyAction } from "@/lib/analytics/journeyEvents";
import { addDaysISTKey, todayISTKey } from "@/lib/admin/istDates";
import { adminSegmentLabelFromProfile } from "@/lib/profileTrackSegment";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type JourneySegment =
  | "explorer"
  | "activated"
  | "engaged"
  | "power"
  | "at_risk"
  | "churned";

export type FunnelStep = {
  label: string;
  count: number;
  pctOfStart: number;
  dropOffPct: number;
};

export type JourneySnapshot = {
  windowDays: number;
  northStar: {
    day1RetentionPct: number;
    day7RetentionPct: number;
    activationRatePct: number;
    medianTtfaSeconds: number | null;
    p75TtfaSeconds: number | null;
    avgSessionMinutes7d: number | null;
  };
  onboardingFunnel: FunnelStep[];
  activationFunnel: FunnelStep[];
  retention: {
    dau: number;
    wau: number;
    mau: number;
    churned7d: number;
    churned14d: number;
  };
  featureUsage: { feature: string; count: number }[];
  aiUsage: {
    questionsLast7d: number;
    repeatUsersLast7d: number;
    avgUserMessagesPerDay: number;
  };
  studyBehavior: {
    tasksCreated7d: number;
    tasksCompleted7d: number;
    studySessions7d: number;
  };
  voiceUsage: {
    totalSeconds7d: number;
    totalInstructions7d: number;
    usersWithVoice7d: number;
    avgSecondsPerVoiceUser7d: number;
    byFeature: { feature: string; instructions: number; seconds: number }[];
  };
  segments: { segment: JourneySegment; count: number }[];
  segmentUsers: JourneySegmentUserRow[];
};

export type JourneySegmentUserRow = {
  userId: string;
  exam: string;
  signupAt: string | null;
  lastActiveAt: string | null;
  totalSessions: number;
  studySeconds7d: number;
  currentStreak: number;
  activated: boolean;
  returnedDay1: boolean;
  returnedDay7: boolean;
  segment: JourneySegment;
  voiceSeconds7d: number;
  voiceInstructions7d: number;
};

function formatVoiceDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export { formatVoiceDuration };

function pct(n: number, d: number): number {
  return d > 0 ? (n / d) * 100 : 0;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].toSorted((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function p75(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].toSorted((a, b) => a - b);
  return s[Math.floor(s.length * 0.75)] ?? null;
}

function buildFunnel(labels: string[], counts: number[]): FunnelStep[] {
  const start = counts[0] ?? 0;
  return labels.map((label, i) => {
    const count = counts[i] ?? 0;
    const prev = i > 0 ? (counts[i - 1] ?? 0) : count;
    const dropOffPct = i === 0 ? 0 : prev > 0 ? ((prev - count) / prev) * 100 : 0;
    return {
      label,
      count,
      pctOfStart: pct(count, start),
      dropOffPct,
    };
  });
}

export async function getJourneySnapshot(windowDays = 7): Promise<JourneySnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();
  const cohortSince = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const today = todayISTKey();
  const from7 = addDaysISTKey(today, -6);
  const from30 = addDaysISTKey(today, -29);

  const [
    { data: metricsRows },
    { data: profiles },
    { data: activityLogs },
    { data: activeTime7 },
    { data: activeTime30 },
    { data: tasks7d },
    { count: studySessions7d },
    { data: voiceEvents7d },
  ] = await Promise.all([
    admin.from("user_journey_metrics" as never).select("*").limit(5000),
    admin
      .from("user_profiles")
      .select(
        "user_id, mandatory_onboarding_completed_at, target_exam, primary_exam, selected_track",
      )
      .not("user_id", "is", null),
    admin
      .from("user_activity_logs")
      .select("user_id, action, feature, created_at")
      .gte("created_at", since)
      .limit(25_000),
    admin
      .from("user_app_active_time_daily")
      .select("user_id, date_ist, active_seconds")
      .gte("date_ist", from7),
    admin
      .from("user_app_active_time_daily")
      .select("user_id, date_ist, active_seconds")
      .gte("date_ist", from30),
    admin
      .from("daily_tasks")
      .select("id, status, created_at, daily_plans!inner(user_id)")
      .gte("created_at", since)
      .limit(5000),
    admin
      .from("study_sessions")
      .select("id", { count: "exact", head: true })
      .gte("started_at", since),
    admin
      .from("user_voice_usage_events" as never)
      .select("user_id, feature, seconds_charged")
      .gte("created_at", since)
      .limit(20_000),
  ]);

  type MetricsRow = {
    user_id: string;
    signup_at: string | null;
    returned_day_1: boolean;
    returned_day_7: boolean;
    activated_at: string | null;
    time_to_first_value_seconds: number | null;
    avg_session_seconds_7d: number | null;
    segment: JourneySegment;
    last_active_at: string | null;
    total_sessions: number;
    current_streak: number;
    voice_seconds_7d?: number;
    voice_instructions_7d?: number;
  };

  const metrics = (metricsRows ?? []) as MetricsRow[];
  const profileMap = new Map(
    ((profiles ?? []) as { user_id: string; mandatory_onboarding_completed_at: string | null; target_exam: string | null; primary_exam: string | null; selected_track: string | null }[]).map(
      (p) => [p.user_id, p],
    ),
  );

  const cohortUsers = metrics.filter(
    (m) => m.signup_at && new Date(m.signup_at).getTime() >= new Date(cohortSince).getTime(),
  );
  const d1Eligible = cohortUsers.filter((m) => {
    if (!m.signup_at) return false;
    const ageDays = (Date.now() - new Date(m.signup_at).getTime()) / (24 * 3600 * 1000);
    return ageDays >= 2;
  });
  const d7Eligible = cohortUsers.filter((m) => {
    if (!m.signup_at) return false;
    const ageDays = (Date.now() - new Date(m.signup_at).getTime()) / (24 * 3600 * 1000);
    return ageDays >= 8;
  });

  const day1RetentionPct = pct(
    d1Eligible.filter((m) => m.returned_day_1).length,
    d1Eligible.length,
  );
  const day7RetentionPct = pct(
    d7Eligible.filter((m) => m.returned_day_7).length,
    d7Eligible.length,
  );
  const activatedInCohort = cohortUsers.filter((m) => m.activated_at).length;
  const activationRatePct = pct(activatedInCohort, cohortUsers.length);

  // react-doctor-disable-next-line react-doctor/js-combine-iterations -- type-narrowing filter after map; flatMap would lose the type predicate
  const ttfaValues = metrics
    .map((m) => m.time_to_first_value_seconds)
    .filter((v): v is number => typeof v === "number" && v >= 0);

  // react-doctor-disable-next-line react-doctor/js-combine-iterations -- type-narrowing filter after map; flatMap would lose the type predicate
  const avgSessionSecs = metrics
    .map((m) => m.avg_session_seconds_7d)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const avgSessionMinutes7d =
    avgSessionSecs.length > 0
      ? avgSessionSecs.reduce((a, b) => a + b, 0) / avgSessionSecs.length / 60
      : null;

  const logs = (activityLogs ?? []) as {
    user_id: string;
    action: string;
    feature: string | null;
    created_at: string;
  }[];

  const countUsersWithAction = (action: string) =>
    // react-doctor-disable-next-line react-doctor/js-combine-iterations -- clear readable filter-then-map; performance not a concern for admin analytics
    new Set(logs.filter((l) => l.action === action).map((l) => l.user_id)).size;

  const onboardingFunnel = buildFunnel(
    [
      "App opened",
      "Onboarding started",
      "Exam selected",
      "Onboarding completed",
    ],
    [
      countUsersWithAction(JourneyAction.APP_OPENED) || countUsersWithAction(JourneyAction.PAGE_VIEW),
      countUsersWithAction(JourneyAction.ONBOARDING_STARTED),
      countUsersWithAction(JourneyAction.EXAM_SELECTED),
      countUsersWithAction(JourneyAction.ONBOARDING_COMPLETED),
    ],
  );

  const activationFunnel = buildFunnel(
    [
      "Onboarding completed",
      "First AI insight",
      "First study session",
      "First task",
    ],
    [
      countUsersWithAction(JourneyAction.ONBOARDING_COMPLETED),
      countUsersWithAction(JourneyAction.AI_CHAT_SENT) +
        countUsersWithAction(JourneyAction.FIRST_AI_INSIGHT),
      countUsersWithAction(JourneyAction.FIRST_STUDY_SESSION),
      countUsersWithAction(JourneyAction.TASK_CREATED) +
        countUsersWithAction(JourneyAction.FIRST_TASK),
    ],
  );

  const active7Users = new Set(
    ((activeTime7 ?? []) as { user_id: string; active_seconds: number }[]).flatMap((r) =>
      r.active_seconds > 0 ? [r.user_id] : [],
    ),
  );
  const active30Users = new Set(
    ((activeTime30 ?? []) as { user_id: string; active_seconds: number }[]).flatMap((r) =>
      r.active_seconds > 0 ? [r.user_id] : [],
    ),
  );

  const now = Date.now();
  const churned7d = metrics.filter((m) => {
    if (!m.last_active_at) return true;
    return now - new Date(m.last_active_at).getTime() > 7 * 24 * 3600 * 1000;
  }).length;
  const churned14d = metrics.filter((m) => {
    if (!m.last_active_at) return true;
    return now - new Date(m.last_active_at).getTime() > 14 * 24 * 3600 * 1000;
  }).length;

  const featureCount = new Map<string, number>();
  for (const l of logs) {
    if (!l.feature) continue;
    const key = l.feature;
    featureCount.set(key, (featureCount.get(key) ?? 0) + 1);
  }
  const featureUsage = [...featureCount.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([feature, count]) => ({ feature, count }));

  const aiLogs = logs.filter(
    (l) => l.action === JourneyAction.AI_CHAT_SENT || l.feature === "prepbrain",
  );
  const aiUserCounts = new Map<string, number>();
  for (const l of aiLogs) {
    aiUserCounts.set(l.user_id, (aiUserCounts.get(l.user_id) ?? 0) + 1);
  }
  const repeatUsersLast7d = [...aiUserCounts.values()].filter((c) => c >= 2).length;

  const taskRows = (tasks7d ?? []) as { status: string }[];
  const tasksCreated7d = taskRows.length;
  const tasksCompleted7d = taskRows.filter((t) => t.status === "done").length;

  const segmentMap = new Map<JourneySegment, number>();
  for (const m of metrics) {
    const seg = (m.segment ?? "explorer") as JourneySegment;
    segmentMap.set(seg, (segmentMap.get(seg) ?? 0) + 1);
  }
  const segments = [...segmentMap.entries()].map(([segment, count]) => ({ segment, count }));

  const studySecondsByUser = new Map<string, number>();
  for (const r of (activeTime7 ?? []) as { user_id: string; active_seconds: number }[]) {
    studySecondsByUser.set(
      r.user_id,
      (studySecondsByUser.get(r.user_id) ?? 0) + r.active_seconds,
    );
  }

  const voiceRows = (voiceEvents7d ?? []) as {
    user_id: string;
    feature: string;
    seconds_charged: number;
  }[];
  const voiceByFeature = new Map<string, { instructions: number; seconds: number }>();
  const voiceUsers7d = new Set<string>();
  let totalVoiceSeconds7d = 0;
  for (const v of voiceRows) {
    totalVoiceSeconds7d += v.seconds_charged ?? 0;
    voiceUsers7d.add(v.user_id);
    const slot = voiceByFeature.get(v.feature) ?? { instructions: 0, seconds: 0 };
    slot.instructions += 1;
    slot.seconds += v.seconds_charged ?? 0;
    voiceByFeature.set(v.feature, slot);
  }
  const totalVoiceInstructions7d = voiceRows.length;
  const byFeature = [...voiceByFeature.entries()]
    .map(([feature, v]) => ({ feature, ...v }))
    .toSorted((a, b) => b.instructions - a.instructions)
    .slice(0, 8);

  const segmentUsers: JourneySegmentUserRow[] = metrics.slice(0, 100).map((m) => {
    const prof = profileMap.get(m.user_id);
    return {
      userId: m.user_id,
      exam: prof ? adminSegmentLabelFromProfile(prof) : "—",
      signupAt: m.signup_at,
      lastActiveAt: m.last_active_at,
      totalSessions: m.total_sessions,
      studySeconds7d: studySecondsByUser.get(m.user_id) ?? 0,
      currentStreak: m.current_streak,
      activated: !!m.activated_at,
      returnedDay1: m.returned_day_1,
      returnedDay7: m.returned_day_7,
      segment: m.segment,
      voiceSeconds7d: m.voice_seconds_7d ?? 0,
      voiceInstructions7d: m.voice_instructions_7d ?? 0,
    };
  });

  return {
    windowDays,
    northStar: {
      day1RetentionPct,
      day7RetentionPct,
      activationRatePct,
      medianTtfaSeconds: median(ttfaValues),
      p75TtfaSeconds: p75(ttfaValues),
      avgSessionMinutes7d,
    },
    onboardingFunnel,
    activationFunnel,
    retention: {
      dau: active7Users.size,
      wau: active7Users.size,
      mau: active30Users.size,
      churned7d,
      churned14d,
    },
    featureUsage,
    aiUsage: {
      questionsLast7d: aiLogs.length,
      repeatUsersLast7d,
      avgUserMessagesPerDay: windowDays > 0 ? aiLogs.length / windowDays : 0,
    },
    studyBehavior: {
      tasksCreated7d,
      tasksCompleted7d,
      studySessions7d: studySessions7d ?? 0,
    },
    voiceUsage: {
      totalSeconds7d: totalVoiceSeconds7d,
      totalInstructions7d: totalVoiceInstructions7d,
      usersWithVoice7d: voiceUsers7d.size,
      avgSecondsPerVoiceUser7d:
        voiceUsers7d.size > 0 ? totalVoiceSeconds7d / voiceUsers7d.size : 0,
      byFeature,
    },
    segments,
    segmentUsers,
  };
}

export async function getJourneyMetricsForUser(
  userId: string,
): Promise<(JourneySegmentUserRow & { onboardingCompleted: boolean }) | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const [{ data: m }, { data: profile }, { data: active7 }] = await Promise.all([
    admin.from("user_journey_metrics" as never).select("*").eq("user_id", userId).maybeSingle(),
    admin.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
    admin
      .from("user_app_active_time_daily")
      .select("active_seconds")
      .eq("user_id", userId)
      .gte("date_ist", addDaysISTKey(todayISTKey(), -6)),
  ]);

  if (!m) return null;
  const row = m as MetricsRow;
  const prof = profile as {
    mandatory_onboarding_completed_at: string | null;
    target_exam: string | null;
    primary_exam: string | null;
    selected_track: string | null;
  } | null;
  const studySeconds7d = ((active7 ?? []) as { active_seconds: number }[]).reduce(
    (s, r) => s + r.active_seconds,
    0,
  );

  return {
    userId,
    exam: prof ? adminSegmentLabelFromProfile(prof) : "—",
    signupAt: row.signup_at,
    lastActiveAt: row.last_active_at,
    totalSessions: row.total_sessions,
    studySeconds7d,
    currentStreak: row.current_streak,
    activated: !!row.activated_at,
    returnedDay1: row.returned_day_1,
    returnedDay7: row.returned_day_7,
    segment: row.segment,
    voiceSeconds7d: row.voice_seconds_7d ?? 0,
    voiceInstructions7d: row.voice_instructions_7d ?? 0,
    onboardingCompleted: !!prof?.mandatory_onboarding_completed_at,
  };
}

type MetricsRow = {
  user_id: string;
  signup_at: string | null;
  returned_day_1: boolean;
  returned_day_7: boolean;
  activated_at: string | null;
  time_to_first_value_seconds: number | null;
  segment: JourneySegment;
  last_active_at: string | null;
  total_sessions: number;
  current_streak: number;
  voice_seconds_7d?: number;
  voice_instructions_7d?: number;
};
