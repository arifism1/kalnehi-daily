import { getNextBatch, getTotalWaitlistCount } from "@/lib/waitlist/batchEngine";
import { WaitlistJoinClient } from "@/components/waitlist/WaitlistJoinClient";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("waitlist");
export const revalidate = 3600;

function formatBatchDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  });
}

export default async function WaitlistPage() {
  const [batch, totalCount] = await Promise.all([
    getNextBatch(),
    getTotalWaitlistCount(),
  ]);

  return (
    <WaitlistJoinClient
      batchNumber={batch?.batch_number ?? 1}
      opensAt={batch?.opens_at ?? null}
      opensAtFormatted={batch?.opens_at ? formatBatchDate(batch.opens_at) : null}
      totalInQueue={totalCount}
    />
  );
}
