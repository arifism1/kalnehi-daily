import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivityLogRow = {
  id: string;
  user_id: string;
  session_id: string;
  page: string;
  feature: string | null;
  action: string;
  metadata: Record<string, unknown>;
  platform: string;
  created_at: string;
};

export type TopPage = { page: string; count: number };
export type TopAction = { action: string; feature: string | null; count: number };
export type DailyCount = { date: string; count: number };
export type PlatformCount = { platform: string; count: number };

export type UserActivitySummary = {
  rows: ActivityLogRow[];
  totalCount: number;
};

export type ActivitySnapshot = {
  totalEventsLast7d: number;
  uniqueUsersLast7d: number;
  topPages: TopPage[];
  topActions: TopAction[];
  dailyCounts: DailyCount[];
  platformBreakdown: PlatformCount[];
};

// ── Per-user queries ──────────────────────────────────────────────────────────

export async function getRecentActivityForUser(
  userId: string,
  limit = 200,
  beforeIso?: string,
): Promise<UserActivitySummary> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return { rows: [], totalCount: 0 };

  let q = admin
    .from("user_activity_logs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (beforeIso) {
    q = q.lt("created_at", beforeIso);
  }

  const { data, count, error } = await q;
  if (error) {
    console.warn("[activityQueries] getRecentActivityForUser:", error.message);
    return { rows: [], totalCount: 0 };
  }
  return { rows: (data ?? []) as ActivityLogRow[], totalCount: count ?? 0 };
}

// ── Admin-wide snapshot ───────────────────────────────────────────────────────

export async function getActivitySnapshot(days = 7): Promise<ActivitySnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  const { data, error } = await admin
    .from("user_activity_logs")
    .select("user_id, page, feature, action, platform, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20_000);

  if (error) {
    console.warn("[activityQueries] getActivitySnapshot:", error.message);
    return null;
  }

  const rows = (data ?? []) as {
    user_id: string;
    page: string;
    feature: string | null;
    action: string;
    platform: string;
    created_at: string;
  }[];

  // Aggregate in-process (avoids needing DB-level aggregate functions).
  const pageCount = new Map<string, number>();
  const actionKey = new Map<string, { action: string; feature: string | null; count: number }>();
  const dayCount = new Map<string, number>();
  const platformCount = new Map<string, number>();
  const uniqueUsers = new Set<string>();

  for (const r of rows) {
    uniqueUsers.add(r.user_id);

    pageCount.set(r.page, (pageCount.get(r.page) ?? 0) + 1);

    const ak = `${r.action}::${r.feature ?? ""}`;
    const existing = actionKey.get(ak);
    if (existing) {
      existing.count++;
    } else {
      actionKey.set(ak, { action: r.action, feature: r.feature, count: 1 });
    }

    const day = r.created_at.slice(0, 10);
    dayCount.set(day, (dayCount.get(day) ?? 0) + 1);

    platformCount.set(r.platform, (platformCount.get(r.platform) ?? 0) + 1);
  }

  return {
    totalEventsLast7d: rows.length,
    uniqueUsersLast7d: uniqueUsers.size,
    topPages: [...pageCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([page, count]) => ({ page, count })),
    topActions: [...actionKey.values()].sort((a, b) => b.count - a.count).slice(0, 20),
    dailyCounts: [...dayCount.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count })),
    platformBreakdown: [...platformCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([platform, count]) => ({ platform, count })),
  };
}

// ── PWA stats ─────────────────────────────────────────────────────────────────

export type PwaStatsSnapshot = {
  totalUsers: number;
  installedCount: number;
  installedIos: number;
  installedAndroid: number;
  browserCount: number;
  installPct: number;
  recentInstalls: {
    user_id: string;
    pwa_install_status: string;
    pwa_install_platform: string | null;
    pwa_first_opened_at: string | null;
    pwa_last_opened_at: string | null;
  }[];
  dailyInstallEvents: DailyCount[];
};

export async function getPwaStats(days = 30): Promise<PwaStatsSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  const [profilesRes, eventsRes] = await Promise.all([
    admin
      .from("user_profiles")
      .select("user_id, pwa_install_status, pwa_install_platform, pwa_first_opened_at, pwa_last_opened_at")
      .not("pwa_install_status", "is", null),
    admin
      .from("feature_events")
      .select("event, created_at")
      .eq("feature", "pwa")
      .in("event", ["installed", "opened_standalone"])
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(5000),
  ]);

  const [totalRes] = await Promise.all([
    admin.from("user_profiles").select("id", { count: "exact", head: true }),
  ]);

  const profiles = (profilesRes.data ?? []) as {
    user_id: string;
    pwa_install_status: string | null;
    pwa_install_platform: string | null;
    pwa_first_opened_at: string | null;
    pwa_last_opened_at: string | null;
  }[];

  const totalUsers = totalRes.count ?? 0;
  const installedIos = profiles.filter((p) => p.pwa_install_status === "installed_ios").length;
  const installedAndroid = profiles.filter((p) => p.pwa_install_status === "installed_android").length;
  const browserCount = profiles.filter((p) => p.pwa_install_status === "browser").length;
  const installedCount = installedIos + installedAndroid;

  // Daily install events
  const dayCount = new Map<string, number>();
  for (const e of eventsRes.data ?? []) {
    const day = (e as { created_at: string }).created_at.slice(0, 10);
    dayCount.set(day, (dayCount.get(day) ?? 0) + 1);
  }

  return {
    totalUsers,
    installedCount,
    installedIos,
    installedAndroid,
    browserCount,
    installPct: totalUsers > 0 ? (installedCount / totalUsers) * 100 : 0,
    recentInstalls: profiles
      .filter((p) => p.pwa_install_status !== "browser")
      .sort((a, b) => (b.pwa_last_opened_at ?? "").localeCompare(a.pwa_last_opened_at ?? ""))
      .slice(0, 50) as PwaStatsSnapshot["recentInstalls"],
    dailyInstallEvents: [...dayCount.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count })),
  };
}
