import { LandingShell } from "@/components/landing/LandingShell";

/** Public landing page — aggressively cached on the CDN. */
export const revalidate = 3600;

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LandingShell>{children}</LandingShell>;
}
