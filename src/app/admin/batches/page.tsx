import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { getBatchComparisonData } from "@/lib/admin/queries/batchComparisonQueries";
import { AdminBatchesClient } from "@/components/admin/AdminBatchesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAdminData() {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const [
    batchesRes,
    waitlistRes,
    skipCountRes,
    profilesRes,
    paymentsRes,
    studySessionsRes,
    prepbrainRes,
    voiceRes,
  ] = await Promise.all([
    admin.from("batches").select("*").order("batch_number", { ascending: true }),

    admin
      .from("waitlist_entries")
      .select(
        "id, status, batch_id, skipped_waitlist, joined_at, activated_at, user_id, position, contact_email, contact_phone"
      )
      .order("position", { ascending: true }),

    admin
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("skipped_waitlist", true),

    admin
      .from("user_profiles")
      .select(
        "user_id, full_name, subscription_status, subscription_plan, subscription_end_date, has_used_free_trial, has_had_trial, trial_started_at, welcome_ai_tokens_used, trial_voice_seconds_used, payment_grace_until"
      )
      .order("trial_started_at", { ascending: false }),

    admin
      .from("razorpay_processed_payments")
      .select("razorpay_payment_id, user_id, kind, created_at")
      .order("created_at", { ascending: false })
      .limit(200),

    admin
      .from("study_sessions")
      .select("duration_seconds", { count: "exact" })
      .limit(50000),

    admin
      .from("prepbrain_conversations")
      .select("id", { count: "exact", head: true }),

    admin
      .from("voice_timeline_entries")
      .select("id", { count: "exact", head: true }),
  ]);

  const waitlistEntries = (waitlistRes.data ?? []) as {
    id: string;
    status: string;
    batch_id: string | null;
    skipped_waitlist: boolean;
    joined_at: string;
    activated_at: string | null;
    user_id: string | null;
    position: number | null;
    contact_email: string | null;
    contact_phone: string | null;
  }[];

  const profiles = (profilesRes.data ?? []) as {
    user_id: string;
    full_name: string | null;
    subscription_status: string | null;
    subscription_plan: string | null;
    subscription_end_date: string | null;
    has_used_free_trial: boolean | null;
    has_had_trial: boolean | null;
    trial_started_at: string | null;
    welcome_ai_tokens_used: number | null;
    trial_voice_seconds_used: number | null;
    payment_grace_until: string | null;
  }[];

  const payments = (paymentsRes.data ?? []) as {
    razorpay_payment_id: string;
    user_id: string | null;
    kind: string;
    created_at: string;
  }[];

  // Build profile lookup by user_id.
  const profileByUserId = new Map(profiles.map((p) => [p.user_id, p]));

  // Enrich waitlist entries with profile data.
  const enrichedEntries = waitlistEntries.map((e) => {
    const profile = e.user_id ? profileByUserId.get(e.user_id) : undefined;
    return { ...e, profile: profile ?? null };
  });

  // Aggregate study session hours.
  const studySessions = (studySessionsRes.data ?? []) as { duration_seconds: number | null }[];
  const totalStudySeconds = studySessions.reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0
  );

  // KPI summary.
  const now = new Date().toISOString();
  const paid = profiles.filter((p) => p.subscription_status === "active").length;
  const trial = profiles.filter(
    (p) => (p.has_used_free_trial || p.has_had_trial) && p.subscription_status !== "active"
  ).length;
  const grace = profiles.filter(
    (p) => p.payment_grace_until && p.payment_grace_until > now
  ).length;

  return {
    batches: (batchesRes.data ?? []) as {
      id: string;
      batch_number: number;
      opens_at: string;
      closes_at: string | null;
      status: string;
      size: number;
      notes: string | null;
      created_at: string;
    }[],
    waitlistEntries: enrichedEntries,
    totalWaitlist: enrichedEntries.length,
    totalSkipped: skipCountRes.count ?? 0,
    profiles,
    payments,
    kpi: {
      totalProfiles: profiles.length,
      paid,
      trial,
      grace,
      revenueEvents: payments.length,
    },
    engagement: {
      totalStudySessions: studySessionsRes.count ?? 0,
      totalStudyHours: Math.round(totalStudySeconds / 3600),
      totalAIConversations: prepbrainRes.count ?? 0,
      totalVoiceLogs: voiceRes.count ?? 0,
      avgSessionMinutes:
        studySessions.length > 0
          ? Math.round(totalStudySeconds / studySessions.length / 60)
          : 0,
    },
  };
}

export type AdminData = NonNullable<Awaited<ReturnType<typeof getAdminData>>>;

export default async function AdminBatchesPage() {
  const [data, batchCmp] = await Promise.all([getAdminData(), getBatchComparisonData()]);
  if (!data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
        Service role unavailable — check environment variables.
      </div>
    );
  }

  return (
    <AdminBatchesClient
      batches={data.batches}
      waitlistEntries={data.waitlistEntries}
      totalWaitlist={data.totalWaitlist}
      totalSkipped={data.totalSkipped}
      profiles={data.profiles}
      payments={data.payments}
      kpi={data.kpi}
      engagement={data.engagement}
      batchComparison={batchCmp?.rows}
    />
  );
}
