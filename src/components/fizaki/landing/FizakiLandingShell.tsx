import { LandingVisitBeacon } from "@/components/LandingVisitBeacon";
import { FizakiThemeScope } from "@/components/fizaki/FizakiThemeScope";
import { FizakiLandingFooter } from "@/components/fizaki/landing/FizakiLandingFooter";
import { FizakiLandingNav } from "@/components/fizaki/landing/FizakiLandingNav";

export function FizakiLandingShell({ children }: { children: React.ReactNode }) {
  return (
    <FizakiThemeScope className="flex min-h-dvh flex-col bg-kal-page text-kal-text">
      <LandingVisitBeacon />
      <FizakiLandingNav />
      <main className="flex flex-1 flex-col pt-[calc(4rem_+_env(safe-area-inset-top))]">
        {children}
      </main>
      <FizakiLandingFooter />
    </FizakiThemeScope>
  );
}
