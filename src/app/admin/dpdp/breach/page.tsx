import { AdminDpdpBreachClient } from "@/components/admin/dpdp/AdminDpdpBreachClient";
import { listDpdpBreachIncidentsForAdmin } from "@/lib/admin/dpdpQueries";

export const dynamic = "force-dynamic";

export default async function AdminDpdpBreachPage() {
  const initial = await listDpdpBreachIncidentsForAdmin();
  return <AdminDpdpBreachClient initial={initial} />;
}
