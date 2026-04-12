import { MarketingPublicShell } from "@/components/marketing/MarketingPublicShell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingPublicShell>{children}</MarketingPublicShell>;
}
