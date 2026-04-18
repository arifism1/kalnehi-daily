import TargetScoreBlueprintRouteLazy from "./TargetScoreBlueprintRouteLazy";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("targetScoreBlueprint");

export default function TargetScoreBlueprintPage() {
  return <TargetScoreBlueprintRouteLazy />;
}
