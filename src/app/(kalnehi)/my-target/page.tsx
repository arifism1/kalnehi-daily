import { MyTargetClient } from "@/components/myTarget/MyTargetClient";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("myTarget");

export default function MyTargetPage() {
  return <MyTargetClient />;
}
