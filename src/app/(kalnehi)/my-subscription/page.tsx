import { kalnehiPageMetadata } from "@/lib/seo-metadata";

import MySubscriptionRouteLazy from "./MySubscriptionRouteLazy";

export const metadata = kalnehiPageMetadata("mySubscription");

export default function MySubscriptionPage() {
  return <MySubscriptionRouteLazy />;
}
