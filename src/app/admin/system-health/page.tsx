import { AdminSystemHealthClient } from "@/components/admin/system-health/AdminSystemHealthClient";
import { getSystemHealthSnapshot } from "@/lib/admin/queries/systemHealthQueries";

export const dynamic = "force-dynamic";

export default async function AdminSystemHealthPage() {
  const data = await getSystemHealthSnapshot();
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminSystemHealthClient data={data} />;
}
