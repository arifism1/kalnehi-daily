import { kalnehiPageMetadata, SITE_NAME } from "@/lib/seo-metadata";
import { PlannerBannerIllustration } from "@/components/illustrations/PlannerBannerIllustration";
import { PlannerLandingModules } from "@/components/planner/PlannerLandingModules";

export const metadata = kalnehiPageMetadata("planner");

export default function PlannerLandingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-4">
        <div className="kal-glass-subtle overflow-hidden rounded-2xl">
          <PlannerBannerIllustration className="w-full" />
        </div>
        <div className="space-y-2">
          <h1 className="kal-hero-heading">
            Study planner — built for JEE, NEET & Boards
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            {SITE_NAME} connects your target exam to a weekly rhythm: schedule deep work, manage
            todos, lock routines, and track habits in one installable PWA. Pick a module below to plan
            the layer you need today.
          </p>
        </div>
      </header>

      <PlannerLandingModules />

      <section
        className="kal-glass-subtle rounded-2xl px-4 py-5 text-sm leading-relaxed text-kal-text-secondary"
        aria-labelledby="planner-seo-more"
      >
        <h2 id="planner-seo-more" className="kal-section-heading">
          Why a single planner matters for competitive exams
        </h2>
        <p className="mt-3">
          Fragmented notes and scattered apps hide the real bottleneck: execution. {SITE_NAME} keeps
          weekly intent, daily tasks, and habit loops in one place so you can see whether your plan is
          realistic — and fix it before you lose weeks. Install the app on Android for quick access
          from your home screen and fewer distractions than hopping between browser tabs.
        </p>
      </section>
    </div>
  );
}
