import { AdminAcquisitionClient } from "@/components/admin/acquisition/AdminAcquisitionClient";
import { getAcquisitionSnapshot } from "@/lib/admin/queries/acquisitionQueries";

export const dynamic = "force-dynamic";

export default async function AdminAcquisitionPage() {
  const data = await getAcquisitionSnapshot();
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminAcquisitionClient data={data} />;
}
