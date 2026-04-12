import { kalnehiPageMetadata } from "@/lib/seo-metadata";

import DailyPlanRouteLazy from "./DailyPlanRouteLazy";

export const metadata = kalnehiPageMetadata("dailyPlan");

export default function DailyPlanPage() {
  return <DailyPlanRouteLazy />;
}
