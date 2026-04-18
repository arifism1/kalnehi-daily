import SavedPlansRouteLazy from "./SavedPlansRouteLazy";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("savedPlans");

export default function SavedPlansPage() {
  return <SavedPlansRouteLazy />;
}
