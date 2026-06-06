import { AdminDpdpClient } from "@/components/admin/dpdp/AdminDpdpClient";
import { listDpdpRightsRequestsForAdmin } from "@/lib/admin/dpdpQueries";

export const dynamic = "force-dynamic";

export default async function AdminDpdpPage() {
  const initial = await listDpdpRightsRequestsForAdmin();
  return <AdminDpdpClient initial={initial} />;
}
