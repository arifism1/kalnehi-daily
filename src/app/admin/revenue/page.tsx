import { AdminRevenueClient } from "@/components/admin/revenue/AdminRevenueClient";
import { getRevenueSnapshot } from "@/lib/admin/queries/revenueQueries";

export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  const data = await getRevenueSnapshot();
  if (!data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
        Service role unavailable.
      </div>
    );
  }
  return <AdminRevenueClient data={data} />;
}
