import { SavedPlansPageContent } from "@/components/planner/SavedPlansPageContent";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("savedPlans");

export default function SavedPlansPage() {
  return <SavedPlansPageContent />;
}
