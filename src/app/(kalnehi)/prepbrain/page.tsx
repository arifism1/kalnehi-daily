import { PrepBrainSeoSection } from "@/components/seo/PrepBrainSeoSection";
import { PrepBrainPageClient } from "@/components/prepbrain/PrepBrainPageClient";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("prepbrain");

export default function PrepBrainPage() {
  return (
    <>
      <PrepBrainPageClient />
      <PrepBrainSeoSection />
    </>
  );
}
