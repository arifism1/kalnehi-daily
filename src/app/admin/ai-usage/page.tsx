import { AdminAiUsageClient } from "@/components/admin/ai-usage/AdminAiUsageClient";
import { getAiUsageSnapshot } from "@/lib/admin/queries/aiUsageQueries";

export const dynamic = "force-dynamic";

export default async function AdminAiUsagePage() {
  const data = await getAiUsageSnapshot();
  if (!data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
        Service role unavailable.
      </div>
    );
  }
  return <AdminAiUsageClient data={data} />;
}
