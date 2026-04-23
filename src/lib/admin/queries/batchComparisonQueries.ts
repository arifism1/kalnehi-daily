import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import { loadAdminPricingInr, paymentKindToInr } from "@/lib/admin/pricing";

export type BatchComparisonRow = {
  batchId: string;
  batchNumber: number;
  status: string;
  size: number;
  opensAt: string;
  notes: string | null;
  joined: number;
  activated: number;
  skipped: number;
  paidInBatch: number;
  revenueInr: number;
  aiCostInrApprox: number;
  netInrApprox: number;
};

export async function getBatchComparisonData(): Promise<{
  rows: BatchComparisonRow[];
  payments: { user_id: string; kind: string; created_at: string }[];
} | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const pricing = await loadAdminPricingInr();

  const [{ data: batches }, { data: entries }, { data: profiles }, { data: payments }, { data: tokens }] =
    await Promise.all([
      admin.from("batches").select("id, batch_number, status, size, opens_at, notes").order("batch_number"),
      admin.from("waitlist_entries").select("batch_id, user_id, status, skipped_waitlist"),
      admin.from("user_profiles").select("user_id, subscription_status, subscription_end_date"),
      admin.from("razorpay_processed_payments").select("user_id, kind, created_at").limit(5000),
      admin
        .from("prepbrain_ai_token_reservations")
        .select("user_id, estimate, finalized_at")
        .not("finalized_at", "is", null)
        .limit(8000),
    ]);

  const batchList = (batches ?? []) as {
    id: string;
    batch_number: number;
    status: string;
    size: number;
    opens_at: string;
    notes: string | null;
  }[];

  const entryList = (entries ?? []) as {
    batch_id: string | null;
    user_id: string;
    status: string;
    skipped_waitlist: boolean;
  }[];

  const profList = (profiles ?? []) as {
    user_id: string | null;
    subscription_status: string | null;
    subscription_end_date: string | null;
  }[];

  const payList = (payments ?? []) as { user_id: string; kind: string; created_at: string }[];

  const userToBatch = new Map<string, string>();
  for (const e of entryList) {
    if (e.batch_id) userToBatch.set(e.user_id, e.batch_id);
  }

  const isPaid = (uid: string) => {
    const p = profList.find((x) => x.user_id === uid);
    if (!p) return false;
    return (
      (p.subscription_status === "active" || p.subscription_status === "cancelled") &&
      p.subscription_end_date &&
      new Date(p.subscription_end_date) > new Date()
    );
  };

  const userRevenue = new Map<string, number>();
  for (const pay of payList) {
    userRevenue.set(pay.user_id, (userRevenue.get(pay.user_id) ?? 0) + paymentKindToInr(pay.kind, pricing));
  }

  const userTokens = new Map<string, number>();
  for (const t of (tokens ?? []) as { user_id: string; estimate: number; finalized_at: string }[]) {
    userTokens.set(t.user_id, (userTokens.get(t.user_id) ?? 0) + t.estimate);
  }

  const rows: BatchComparisonRow[] = batchList.map((b) => {
    const batchEntries = entryList.filter((e) => e.batch_id === b.id);
    const userIds = new Set(batchEntries.map((e) => e.user_id));
    const activated = batchEntries.filter(
      (e) => e.status === "activated" || e.status === "expired_no_convert",
    ).length;
    const skipped = batchEntries.filter((e) => e.skipped_waitlist).length;
    let paidInBatch = 0;
    let revenueInr = 0;
    let tok = 0;
    for (const uid of userIds) {
      if (isPaid(uid)) paidInBatch++;
      revenueInr += userRevenue.get(uid) ?? 0;
      tok += userTokens.get(uid) ?? 0;
    }
    // Use blended DeepInfra rate as an approximation for batch-level cost
    const blendedRateInrPerM = (pricing.deepinfraInputInrPerM + pricing.deepinfraOutputInrPerM) / 2;
    const aiCostInrApprox = (tok / 1_000_000) * blendedRateInrPerM;
    return {
      batchId: b.id,
      batchNumber: b.batch_number,
      status: b.status,
      size: b.size,
      opensAt: b.opens_at,
      notes: b.notes,
      joined: batchEntries.length,
      activated,
      skipped,
      paidInBatch,
      revenueInr,
      aiCostInrApprox,
      netInrApprox: revenueInr - aiCostInrApprox,
    };
  });

  return { rows, payments: payList };
}
