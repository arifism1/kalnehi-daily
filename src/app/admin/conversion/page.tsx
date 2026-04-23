import { AdminConversionClient } from "@/components/admin/conversion/AdminConversionClient";
import { getConversionSnapshot } from "@/lib/admin/queries/conversionQueries";

export const dynamic = "force-dynamic";

export default async function AdminConversionPage() {
  const data = await getConversionSnapshot();
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminConversionClient data={data} />;
}
