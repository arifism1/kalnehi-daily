import { AdminActivationClient } from "@/components/admin/activation/AdminActivationClient";
import { getActivationSnapshot } from "@/lib/admin/queries/featureEventQueries";

export const dynamic = "force-dynamic";

export default async function AdminActivationPage() {
  const data = await getActivationSnapshot();
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminActivationClient data={data} />;
}
