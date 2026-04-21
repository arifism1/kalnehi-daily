import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export function LandingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#F7F4EE] text-kal-text">
      <LandingNav />
      <main className="flex flex-1 flex-col pt-16">{children}</main>
      <LandingFooter />
    </div>
  );
}
