import { HomeClient } from "@/components/home/HomeClient";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("home");

export default function HomePage() {
  return <HomeClient />;
}
