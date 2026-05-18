import { AdminJourneyClient } from "@/components/admin/journey/AdminJourneyClient";
import { getJourneySnapshot } from "@/lib/admin/queries/journeyQueries";

export const dynamic = "force-dynamic";

export default async function AdminJourneyPage() {
  const data = await getJourneySnapshot(7);
  if (!data) {
    return <p className="text-sm text-red-500">Service role unavailable.</p>;
  }
  return <AdminJourneyClient data={data} />;
}
