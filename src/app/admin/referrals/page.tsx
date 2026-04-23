import { AdminReferralsClient } from "@/components/admin/referrals/AdminReferralsClient";
import { getReferralSnapshot } from "@/lib/admin/queries/referralQueries";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const data = await getReferralSnapshot();
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminReferralsClient data={data} />;
}
