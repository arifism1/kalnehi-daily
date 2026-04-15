import { TargetScoreBlueprintClient } from "@/components/targetScoreBlueprint/TargetScoreBlueprintClient";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("targetScoreBlueprint");

export default function TargetScoreBlueprintPage() {
  return <TargetScoreBlueprintClient />;
}
