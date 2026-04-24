import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("debrief");

export default function DebriefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
