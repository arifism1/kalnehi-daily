import { LandingShell } from "@/components/landing/LandingShell";
import { FizakiLandingShell } from "@/components/fizaki/landing/FizakiLandingShell";
import { getBuildVertical } from "@/lib/vertical/resolveVertical";

/** Public landing page — aggressively cached on the CDN. */
export const revalidate = 3600;

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (getBuildVertical() === "fizaki") {
    return <FizakiLandingShell>{children}</FizakiLandingShell>;
  }
  return <LandingShell>{children}</LandingShell>;
}
