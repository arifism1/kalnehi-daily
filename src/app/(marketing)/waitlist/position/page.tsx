import { WaitlistPositionClient } from "@/components/waitlist/WaitlistPositionClient";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("waitlist-position");
export const dynamic = "force-dynamic";

export default function WaitlistPositionPage() {
  return <WaitlistPositionClient />;
}
