import { AdminAcquisitionClient } from "@/components/admin/acquisition/AdminAcquisitionClient";
import { getAcquisitionSnapshot } from "@/lib/admin/queries/acquisitionQueries";
import { getLandingVisitSnapshot } from "@/lib/admin/queries/landingVisitQueries";

export const dynamic = "force-dynamic";

export default async function AdminAcquisitionPage() {
  const [data, landing] = await Promise.all([getAcquisitionSnapshot(), getLandingVisitSnapshot()]);
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminAcquisitionClient data={data} landing={landing} />;
}
