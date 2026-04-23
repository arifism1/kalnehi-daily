import { AdminRetentionClient } from "@/components/admin/retention/AdminRetentionClient";
import { getRetentionSnapshot } from "@/lib/admin/queries/retentionQueries";

export const dynamic = "force-dynamic";

export default async function AdminRetentionPage() {
  const data = await getRetentionSnapshot();
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminRetentionClient data={data} />;
}
