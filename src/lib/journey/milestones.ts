import { JourneyAction, MILESTONE_ACTIONS } from "@/lib/analytics/journeyEvents";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

type JourneyStateRow = {
  user_id: string;
  first_app_open_at: string | null;
  onboarding_started_at: string | null;
  onboarding_completed_at: string | null;
  first_ai_insight_at: string | null;
  first_study_session_at: string | null;
  first_task_at: string | null;
  first_chapter_marked_at: string | null;
  first_syllabus_marks_raise_at: string | null;
  first_revision_at: string | null;
  first_mock_logged_at: string | null;
  first_value_at: string | null;
  current_score_entered_at: string | null;
  target_score_entered_at: string | null;
  onboarding_steps: unknown;
};

type JourneyMetricsRow = {
  user_id: string;
  signup_at: string | null;
  last_active_at: string | null;
  total_sessions: number;
  current_streak: number;
  longest_streak: number;
  returned_day_1: boolean;
  returned_day_7: boolean;
  activated_at: string | null;
  segment: string;
  time_to_first_value_seconds: number | null;
  avg_session_seconds_7d: number | null;
  active_days_last_7d: number;
  distinct_features_last_7d: number;
};

function earliest(a: string | null | undefined, b: string): string {
  if (!a) return b;
  return a < b ? a : b;
}

function computeFirstValueAt(state: JourneyStateRow): string | null {
  const candidates = [
    state.first_syllabus_marks_raise_at,
    state.first_ai_insight_at,
    state.first_study_session_at,
    state.first_task_at,
  ].filter(Boolean) as string[];
  if (candidates.length === 0) return state.first_value_at;
  return candidates.sort()[0]!;
}

function isActivated(state: JourneyStateRow, profileOnboardingAt: string | null): boolean {
  const onboarded = !!(state.onboarding_completed_at ?? profileOnboardingAt);
  const hasValue =
    !!(
      state.first_syllabus_marks_raise_at ||
      state.first_ai_insight_at ||
      state.first_study_session_at ||
      state.first_task_at
    );
  return onboarded && hasValue;
}

function dateKeyIST(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function addDaysKey(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function activeDayKeysFromLogs(
  rows: { created_at: string }[],
  activeTimeRows: { date_ist: string; active_seconds: number }[],
): Set<string> {
  const keys = new Set<string>();
  for (const r of rows) keys.add(dateKeyIST(r.created_at));
  for (const r of activeTimeRows) {
    if (r.active_seconds > 0) keys.add(r.date_ist);
  }
  return keys;
}

function countStreaks(sortedDayKeys: string[]): { current: number; longest: number } {
  if (sortedDayKeys.length === 0) return { current: 0, longest: 0 };
  const today = dateKeyIST(new Date().toISOString());
  const set = new Set(sortedDayKeys);
  let current = 0;
  let cursor = today;
  while (set.has(cursor)) {
    current++;
    cursor = addDaysKey(cursor, -1);
  }
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDayKeys.length; i++) {
    const prev = sortedDayKeys[i - 1]!;
    const cur = sortedDayKeys[i]!;
    const expected = addDaysKey(prev, 1);
    if (cur === expected) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return { current, longest };
}

function computeSegment(
  metrics: Pick<
    JourneyMetricsRow,
    "activated_at" | "active_days_last_7d" | "distinct_features_last_7d" | "last_active_at" | "total_sessions"
  >,
  wasEngagedBefore: boolean,
): string {
  const now = Date.now();
  const lastActive = metrics.last_active_at ? new Date(metrics.last_active_at).getTime() : 0;
  const inactiveDays = lastActive ? (now - lastActive) / (24 * 3600 * 1000) : 999;

  if (inactiveDays >= 14) return "churned";
  if (wasEngagedBefore && metrics.active_days_last_7d === 0 && inactiveDays >= 3) return "at_risk";

  const activated = !!metrics.activated_at;
  if (!activated && metrics.total_sessions <= 1) return "explorer";
  if (activated && metrics.active_days_last_7d < 3) return "activated";
  if (metrics.active_days_last_7d >= 3 && metrics.distinct_features_last_7d >= 2) return "power";
  if (metrics.active_days_last_7d >= 3) return "engaged";
  if (activated) return "activated";
  return "explorer";
}

function patchForAction(
  action: string,
  at: string,
  metadata: Record<string, unknown>,
): Partial<JourneyStateRow> {
  switch (action) {
    case JourneyAction.APP_OPENED:
      return { first_app_open_at: at };
    case JourneyAction.ONBOARDING_STARTED:
      return { onboarding_started_at: at };
    case JourneyAction.ONBOARDING_COMPLETED:
      return { onboarding_completed_at: at };
    case JourneyAction.EXAM_SELECTED:
      return {};
    case JourneyAction.CURRENT_SCORE_ENTERED:
      return { current_score_entered_at: at };
    case JourneyAction.TARGET_SCORE_ENTERED:
      return { target_score_entered_at: at };
    case JourneyAction.FIRST_AI_INSIGHT:
    case JourneyAction.AI_CHAT_SENT:
      return { first_ai_insight_at: at };
    case JourneyAction.FIRST_STUDY_SESSION:
      return { first_study_session_at: at };
    case JourneyAction.FIRST_TASK:
    case JourneyAction.TASK_CREATED:
      return { first_task_at: at };
    case JourneyAction.FIRST_CHAPTER_MARKED:
      return { first_chapter_marked_at: at };
    case JourneyAction.FIRST_SYLLABUS_MARKS_RAISE:
      return { first_syllabus_marks_raise_at: at };
    case JourneyAction.FIRST_REVISION:
      return { first_revision_at: at };
    case JourneyAction.FIRST_MOCK:
      return { first_mock_logged_at: at };
    case JourneyAction.ONBOARDING_STEP: {
      const step = metadata.step;
      if (typeof step !== "number") return {};
      return {};
    }
    default:
      return {};
  }
}

/**
 * Apply milestone timestamps from a batch of tracked activity events.
 */
export async function processJourneyMilestones(
  userId: string,
  events: { action: string; created_at: string; metadata?: Record<string, unknown> }[],
): Promise<void> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return;

  const milestoneEvents = events.filter((e) => MILESTONE_ACTIONS.has(e.action));
  if (milestoneEvents.length === 0 && !events.some((e) => e.action === JourneyAction.APP_OPENED)) {
    return;
  }

  const { data: existing } = await admin
    .from("user_journey_state" as never)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let state: JourneyStateRow = (existing as JourneyStateRow | null) ?? {
    user_id: userId,
    first_app_open_at: null,
    onboarding_started_at: null,
    onboarding_completed_at: null,
    first_ai_insight_at: null,
    first_study_session_at: null,
    first_task_at: null,
    first_chapter_marked_at: null,
    first_syllabus_marks_raise_at: null,
    first_revision_at: null,
    first_mock_logged_at: null,
    first_value_at: null,
    current_score_entered_at: null,
    target_score_entered_at: null,
    onboarding_steps: [],
  };

  let steps: { step: number; entered_at: string }[] = Array.isArray(state.onboarding_steps)
    ? (state.onboarding_steps as { step: number; entered_at: string }[])
    : [];

  for (const ev of milestoneEvents) {
    const patch = patchForAction(ev.action, ev.created_at, ev.metadata ?? {});
    if (ev.action === JourneyAction.ONBOARDING_STEP) {
      const step = ev.metadata?.step;
      if (typeof step === "number" && !steps.some((s) => s.step === step)) {
        steps = [...steps, { step, entered_at: ev.created_at }];
      }
      continue;
    }
    if (patch.first_app_open_at)
      state.first_app_open_at = earliest(state.first_app_open_at, patch.first_app_open_at);
    if (patch.onboarding_started_at)
      state.onboarding_started_at = earliest(state.onboarding_started_at, patch.onboarding_started_at);
    if (patch.onboarding_completed_at)
      state.onboarding_completed_at = earliest(state.onboarding_completed_at, patch.onboarding_completed_at);
    if (patch.first_ai_insight_at)
      state.first_ai_insight_at = earliest(state.first_ai_insight_at, patch.first_ai_insight_at);
    if (patch.first_study_session_at)
      state.first_study_session_at = earliest(state.first_study_session_at, patch.first_study_session_at);
    if (patch.first_task_at) state.first_task_at = earliest(state.first_task_at, patch.first_task_at);
    if (patch.first_chapter_marked_at)
      state.first_chapter_marked_at = earliest(state.first_chapter_marked_at, patch.first_chapter_marked_at);
    if (patch.first_syllabus_marks_raise_at)
      state.first_syllabus_marks_raise_at = earliest(
        state.first_syllabus_marks_raise_at,
        patch.first_syllabus_marks_raise_at,
      );
    if (patch.first_revision_at)
      state.first_revision_at = earliest(state.first_revision_at, patch.first_revision_at);
    if (patch.first_mock_logged_at)
      state.first_mock_logged_at = earliest(state.first_mock_logged_at, patch.first_mock_logged_at);
    if (patch.current_score_entered_at)
      state.current_score_entered_at = earliest(
        state.current_score_entered_at,
        patch.current_score_entered_at,
      );
    if (patch.target_score_entered_at)
      state.target_score_entered_at = earliest(
        state.target_score_entered_at,
        patch.target_score_entered_at,
      );
  }

  state.first_value_at = computeFirstValueAt(state);
  state.onboarding_steps = steps;

  const {
    user_id: _uid,
    ...statePayload
  } = state;
  await admin.from("user_journey_state" as never).upsert({
    user_id: userId,
    ...statePayload,
    updated_at: new Date().toISOString(),
  } as never);

  const hasAppOpen = events.some((e) => e.action === JourneyAction.APP_OPENED);
  if (hasAppOpen) {
    await bumpSessionMetrics(userId, events.find((e) => e.action === JourneyAction.APP_OPENED)!.created_at);
  }
}

async function bumpSessionMetrics(userId: string, at: string): Promise<void> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return;

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const signupAt = authUser?.user?.created_at ?? null;

  const { data: metrics } = await admin
    .from("user_journey_metrics" as never)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const row = (metrics as JourneyMetricsRow | null) ?? {
    user_id: userId,
    signup_at: signupAt,
    last_active_at: null,
    total_sessions: 0,
    current_streak: 0,
    longest_streak: 0,
    returned_day_1: false,
    returned_day_7: false,
    activated_at: null,
    segment: "explorer",
    time_to_first_value_seconds: null,
    avg_session_seconds_7d: null,
    active_days_last_7d: 0,
    distinct_features_last_7d: 0,
  };

  await admin.from("user_journey_metrics" as never).upsert({
    user_id: userId,
    signup_at: row.signup_at ?? signupAt,
    last_active_at: at,
    total_sessions: (row.total_sessions ?? 0) + 1,
    current_streak: row.current_streak,
    longest_streak: row.longest_streak,
    returned_day_1: row.returned_day_1,
    returned_day_7: row.returned_day_7,
    activated_at: row.activated_at,
    segment: row.segment,
    time_to_first_value_seconds: row.time_to_first_value_seconds,
    avg_session_seconds_7d: row.avg_session_seconds_7d,
    active_days_last_7d: row.active_days_last_7d,
    distinct_features_last_7d: row.distinct_features_last_7d,
    updated_at: new Date().toISOString(),
  } as never);
}

/** Full rollup for one user (cron + optional repair). */
export async function rollupJourneyMetricsForUser(userId: string): Promise<void> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return;

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const signupAt = authUser?.user?.created_at ?? null;

  const since7Iso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [{ data: stateRow }, { data: profile }, { data: logs }, { data: activeDays }, { data: voiceEvents }] =
    await Promise.all([
      admin.from("user_journey_state" as never).select("*").eq("user_id", userId).maybeSingle(),
      admin
        .from("user_profiles")
        .select("mandatory_onboarding_completed_at")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("user_activity_logs")
        .select("created_at, action, feature, session_id")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString())
        .limit(5000),
      admin
        .from("user_app_active_time_daily")
        .select("date_ist, active_seconds")
        .eq("user_id", userId)
        .gte(
          "date_ist",
          new Date(Date.now() - 90 * 24 * 3600 * 1000).toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
          }),
        ),
      admin
        .from("user_voice_usage_events" as never)
        .select("seconds_charged, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);

  const state = (stateRow as JourneyStateRow | null) ?? ({} as JourneyStateRow);
  const profileOnboarding =
    (profile as { mandatory_onboarding_completed_at?: string | null } | null)
      ?.mandatory_onboarding_completed_at ?? null;

  const logRows = (logs ?? []) as {
    created_at: string;
    action: string;
    feature: string | null;
    session_id: string;
  }[];
  const activeTimeRows = (activeDays ?? []) as { date_ist: string; active_seconds: number }[];

  const dayKeys = [...activeDayKeysFromLogs(logRows, activeTimeRows)].toSorted();
  const { current, longest } = countStreaks(dayKeys);

  const last7Keys = new Set<string>();
  const today = dateKeyIST(new Date().toISOString());
  for (let i = 0; i < 7; i++) last7Keys.add(addDaysKey(today, -i));
  const activeDaysLast7 = dayKeys.filter((k) => last7Keys.has(k)).length;

  const featuresLast7 = new Set<string>();
  const since7 = Date.now() - 7 * 24 * 3600 * 1000;
  for (const r of logRows) {
    if (new Date(r.created_at).getTime() >= since7 && r.feature) featuresLast7.add(r.feature);
  }

  const activated = isActivated(state, profileOnboarding);
  const activatedAt = activated
    ? earliest(
        state.onboarding_completed_at ?? profileOnboarding,
        computeFirstValueAt(state) ?? new Date().toISOString(),
      )
    : null;

  let returnedDay1 = false;
  let returnedDay7 = false;
  if (signupAt) {
    const signupKey = dateKeyIST(signupAt);
    const d1 = addDaysKey(signupKey, 1);
    const d7 = addDaysKey(signupKey, 7);
    const daySet = new Set(dayKeys);
    returnedDay1 = daySet.has(d1);
    returnedDay7 = daySet.has(d7);
  }

  const firstValue = computeFirstValueAt(state);
  let ttfa: number | null = null;
  if (signupAt && firstValue) {
    ttfa = Math.max(
      0,
      Math.floor((new Date(firstValue).getTime() - new Date(signupAt).getTime()) / 1000),
    );
  }

  const sessionIds = new Set(
    logRows.flatMap((r) => r.action === JourneyAction.APP_OPENED ? [r.session_id] : []),
  );
  const pageViewSessions = new Set(logRows.flatMap((r) => r.action === "page_view" ? [r.session_id] : []));
  const appOpenCount = sessionIds.size > 0 ? sessionIds.size : pageViewSessions.size;

  const lastActive =
    logRows.length > 0
      ? logRows.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at
      : null;

  const { data: prevMetrics } = await admin
    .from("user_journey_metrics" as never)
    .select("segment, active_days_last_7d, total_sessions")
    .eq("user_id", userId)
    .maybeSingle();

  const wasEngagedBefore =
    (prevMetrics as { segment?: string; active_days_last_7d?: number } | null)?.segment ===
      "engaged" ||
    (prevMetrics as { active_days_last_7d?: number } | null)?.active_days_last_7d === 3;

  const segment = computeSegment(
    {
      activated_at: activatedAt,
      active_days_last_7d: activeDaysLast7,
      distinct_features_last_7d: featuresLast7.size,
      last_active_at: lastActive,
      total_sessions: appOpenCount,
    },
    wasEngagedBefore,
  );

  const { data: active7d } = await admin
    .from("user_app_active_time_daily")
    .select("active_seconds")
    .eq("user_id", userId)
    .gte("date_ist", addDaysKey(today, -6));

  const seconds7 = ((active7d ?? []) as { active_seconds: number }[]).reduce(
    (s, r) => s + r.active_seconds,
    0,
  );
  const avgSessionSeconds =
    activeDaysLast7 > 0 ? Math.round(seconds7 / activeDaysLast7) : null;

  const prevTotal =
    (prevMetrics as { total_sessions?: number } | null)?.total_sessions ?? 0;

  const voiceRows = (voiceEvents ?? []) as { seconds_charged: number; created_at: string }[];
  let voiceSecondsLifetime = 0;
  let voiceInstructionsLifetime = 0;
  let voiceSeconds7d = 0;
  let voiceInstructions7d = 0;
  const since7Ms = new Date(since7Iso).getTime();
  for (const v of voiceRows) {
    const sec = v.seconds_charged ?? 0;
    voiceSecondsLifetime += sec;
    voiceInstructionsLifetime += 1;
    if (new Date(v.created_at).getTime() >= since7Ms) {
      voiceSeconds7d += sec;
      voiceInstructions7d += 1;
    }
  }

  await admin.from("user_journey_metrics" as never).upsert({
    user_id: userId,
    signup_at: signupAt,
    last_active_at: lastActive,
    total_sessions: Math.max(prevTotal, appOpenCount),
    current_streak: current,
    longest_streak: longest,
    returned_day_1: returnedDay1,
    returned_day_7: returnedDay7,
    activated_at: activatedAt,
    segment,
    time_to_first_value_seconds: ttfa,
    avg_session_seconds_7d: avgSessionSeconds,
    active_days_last_7d: activeDaysLast7,
    distinct_features_last_7d: featuresLast7.size,
    voice_seconds_7d: voiceSeconds7d,
    voice_instructions_7d: voiceInstructions7d,
    voice_seconds_lifetime: voiceSecondsLifetime,
    voice_instructions_lifetime: voiceInstructionsLifetime,
    updated_at: new Date().toISOString(),
  } as never);
}

export async function recordJourneyMilestoneServer(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const at = new Date().toISOString();
  await processJourneyMilestones(userId, [{ action, created_at: at, metadata }]);
}
