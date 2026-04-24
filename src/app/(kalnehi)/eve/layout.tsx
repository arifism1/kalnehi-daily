import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("eve");

export default function EveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
