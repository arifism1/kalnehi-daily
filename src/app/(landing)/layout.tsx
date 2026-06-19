import { LandingShell } from "@/components/landing/LandingShell";
import { FizakiLandingShell } from "@/components/fizaki/landing/FizakiLandingShell";
import { getLandingVertical } from "@/lib/vertical/landingVertical";

/** Public landing page — aggressively cached on the CDN. */
export const revalidate = 3600;

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if ((await getLandingVertical()) === "fizaki") {
    return <FizakiLandingShell>{children}</FizakiLandingShell>;
  }
  return <LandingShell>{children}</LandingShell>;
}
