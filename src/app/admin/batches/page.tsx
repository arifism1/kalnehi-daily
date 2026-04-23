import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { AdminBatchesClient } from "@/components/admin/AdminBatchesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAdminData() {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const [batchesRes, waitlistRes, skipCountRes] = await Promise.all([
    admin
      .from("batches")
      .select("*")
      .order("batch_number", { ascending: true }),
    admin
      .from("waitlist_entries")
      .select("id, status, batch_id, skipped_waitlist, joined_at, activated_at"),
    admin
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("skipped_waitlist", true),
  ]);

  // Get conversion data: activated entries whose user has a paid subscription.
  const activatedEntries = (waitlistRes.data ?? []) as {
    id: string; status: string; batch_id: string | null;
    skipped_waitlist: boolean; joined_at: string; activated_at: string | null;
  }[];

  return {
    batches: (batchesRes.data ?? []) as {
      id: string; batch_number: number; opens_at: string; closes_at: string | null;
      status: string; size: number; notes: string | null; created_at: string;
    }[],
    waitlistEntries: activatedEntries,
    totalWaitlist: activatedEntries.length,
    totalSkipped: skipCountRes.count ?? 0,
  };
}

export default async function AdminBatchesPage() {
  const data = await getAdminData();
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
    />
  );
}
