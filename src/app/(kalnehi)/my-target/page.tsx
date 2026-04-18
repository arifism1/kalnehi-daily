import MyTargetRouteLazy from "./MyTargetRouteLazy";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("myTarget");

export default function MyTargetPage() {
  return <MyTargetRouteLazy />;
}
