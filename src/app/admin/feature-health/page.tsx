import { AdminFeatureHealthClient } from "@/components/admin/feature-health/AdminFeatureHealthClient";
import { getFeatureHealthSnapshot } from "@/lib/admin/queries/featureHealthQueries";

export const dynamic = "force-dynamic";

export default async function AdminFeatureHealthPage() {
  const data = await getFeatureHealthSnapshot();
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminFeatureHealthClient data={data} />;
}
