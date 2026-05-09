import { ensureJoinableBatch, getTotalWaitlistCount } from "@/lib/waitlist/batchEngine";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WaitlistJoinClient } from "@/components/waitlist/WaitlistJoinClient";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("waitlist");
/** Session email pre-fill requires fresh auth on each request. */
export const dynamic = "force-dynamic";

function formatBatchDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  });
}

export default async function WaitlistPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const accountEmail = user?.email?.trim() || null;

  const [batch, totalCount] = await Promise.all([
    ensureJoinableBatch(),
    getTotalWaitlistCount(),
  ]);

  return (
    <WaitlistJoinClient
      batchNumber={batch?.batch_number ?? 1}
      opensAtFormatted={batch?.opens_at ? formatBatchDate(batch.opens_at) : null}
      totalInQueue={totalCount}
      accountEmail={accountEmail}
    />
  );
}
