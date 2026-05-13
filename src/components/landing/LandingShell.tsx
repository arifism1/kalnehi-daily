import { LandingVisitBeacon } from "@/components/LandingVisitBeacon";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export function LandingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-kal-page text-kal-text">
      <LandingVisitBeacon />
      <LandingNav />
      <main className="flex flex-1 flex-col pt-[calc(4rem_+_env(safe-area-inset-top))]">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
