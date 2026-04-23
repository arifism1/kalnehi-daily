import { getOverviewSnapshot } from "@/lib/admin/queries/overviewQueries";
import { AdminOverviewClient } from "@/components/admin/overview/AdminOverviewClient";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const data = await getOverviewSnapshot();
  if (!data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
        Service role unavailable — check environment variables.
      </div>
    );
  }
  return <AdminOverviewClient data={data} />;
}
