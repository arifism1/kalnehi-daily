import { AdminEngagementClient } from "@/components/admin/engagement/AdminEngagementClient";
import { getEngagementSnapshot } from "@/lib/admin/queries/engagementQueries";

export const dynamic = "force-dynamic";

export default async function AdminEngagementPage() {
  const data = await getEngagementSnapshot();
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminEngagementClient data={data} />;
}
