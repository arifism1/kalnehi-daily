import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAppConfig, fetchFeatureFlags, fetchAppConfigLog } from "@/lib/admin/killSwitch";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { AdminSystemClient } from "@/components/admin/system/AdminSystemClient";
import type { DailyCountRow } from "@/components/admin/system/AdminDailyCapSection";

export const dynamic = "force-dynamic";

async function fetchDailyCapHistory(): Promise<DailyCountRow[]> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().split("T")[0]!;

  const [{ data: counts }, { data: skipRows }] = await Promise.all([
    admin
      .from("daily_trial_counts" as never)
      .select("date, trials_started, cap")
      .gte("date" as never, since)
      .order("date" as never, { ascending: false })
      .limit(35),
    admin
      .from("user_profiles")
      .select("trial_date")
      .eq("trial_access_type" as never, "skip_paid")
      .gte("trial_date" as never, since)
      .not("trial_date" as never, "is", null),
  ]);

  const skipByDate = new Map<string, number>();
  for (const row of (skipRows ?? []) as unknown as { trial_date: string }[]) {
    if (row.trial_date) {
      skipByDate.set(row.trial_date, (skipByDate.get(row.trial_date) ?? 0) + 1);
    }
  }

  return ((counts ?? []) as { date: string; trials_started: number; cap: number }[]).map((r) => ({
    date: r.date,
    trials_started: r.trials_started,
    cap: r.cap,
    skip_paid_count: skipByDate.get(r.date) ?? 0,
  }));
}

export default async function AdminSystemPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [config, flags, auditLog, dailyCapHistory] = await Promise.all([
    fetchAppConfig(),
    fetchFeatureFlags(),
    fetchAppConfigLog(50),
    fetchDailyCapHistory(),
  ]);

  if (!config) {
    return (
      <div className="text-sm text-kal-danger-text">
        Could not load app config. Service role unavailable.
      </div>
    );
  }

  return (
    <AdminSystemClient
      config={config}
      flags={flags}
      auditLog={auditLog}
      userId={user?.id ?? ""}
      dailyCapHistory={dailyCapHistory}
    />
  );
}
