import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("morning");

export default function MorningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
