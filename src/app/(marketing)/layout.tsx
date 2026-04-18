import { MarketingPublicShell } from "@/components/marketing/MarketingPublicShell";

/** Public marketing content; safe to regenerate periodically on the CDN. */
export const revalidate = 600;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingPublicShell>{children}</MarketingPublicShell>;
}
