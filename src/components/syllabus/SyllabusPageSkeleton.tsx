import clsx from "clsx";
import type { CSSProperties } from "react";

import { KalnehiMark } from "@/components/KalnehiMark";
import { KalShimmerBlock } from "@/components/loading/KalShimmerBlock";
import { SyllabusPageHeader } from "@/components/syllabus/SyllabusPageHeader";

export type SyllabusPageSkeletonProps = {
  /** Include header + bottom tab placeholders (AppShell bootstrap). */
  showChrome?: boolean;
  /** Context line under overview (default true). */
  showStatus?: boolean;
  className?: string;
};

function StatValueSkeleton({ delayMs }: { delayMs?: number }) {
  return (
    <KalShimmerBlock
      delayMs={delayMs}
      className="kal-home-stat-value inline-block h-[1.25rem] min-w-[3.75rem] rounded-md sm:h-7 sm:min-w-[4.25rem]"
    />
  );
}

/** Mirrors compact `SyllabusOverviewPanel` stat row + progress bar. */
function SyllabusOverviewSkeleton() {
  return (
    <section className="kal-glass-panel overflow-hidden rounded-2xl border-kal-accent/35 p-3 shadow-lg">
      <KalShimmerBlock className="h-3 w-44 max-w-[85%] rounded-md" />
      <div
        className="mt-1.5 flex divide-x"
        style={{ "--divide-color": "rgba(186,117,23,0.2)" } as CSSProperties}
      >
        <div className="flex min-w-0 flex-1 flex-col items-center gap-0 px-2 py-1.5 text-center">
          <StatValueSkeleton />
          <KalShimmerBlock className="mt-0.5 h-2.5 w-12 rounded" />
        </div>
        <div
          className="w-px self-stretch shrink-0"
          style={{ background: "rgba(186,117,23,0.2)" }}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-0 px-2 py-1.5 text-center">
          <StatValueSkeleton delayMs={40} />
        </div>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-kal-card-muted">
        <KalShimmerBlock className="h-full w-[38%] rounded-full" delayMs={80} />
      </div>
      <KalShimmerBlock
        className="mx-auto mt-1.5 h-2 w-36 max-w-[90%] rounded"
        delayMs={100}
      />
    </section>
  );
}

function SyllabusToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <KalShimmerBlock className="h-9 min-w-[7rem] flex-1 max-w-[10rem] rounded-xl" />
      <KalShimmerBlock className="size-9 shrink-0 rounded-xl" />
    </div>
  );
}

/** Collapsed subject card — matches default closed accordion. */
function SubjectCardSkeleton({ staggerIndex = 0 }: { staggerIndex?: number }) {
  const baseDelay = staggerIndex * 80;
  return (
    <div className="kal-glass-panel overflow-hidden rounded-2xl dark:border-white/12">
      <div className="px-5 py-4">
        <div className="flex min-h-[48px] items-start justify-between gap-2 sm:items-center">
          <span className="flex min-w-0 items-start gap-2 sm:items-center">
            <KalShimmerBlock
              delayMs={baseDelay}
              className="size-5 shrink-0 rounded-md"
            />
            <KalShimmerBlock
              delayMs={baseDelay + 20}
              className="h-4 w-36 max-w-[12rem] rounded-md"
            />
          </span>
          <KalShimmerBlock
            delayMs={baseDelay + 30}
            className="size-5 shrink-0 rounded-md"
          />
        </div>
        <KalShimmerBlock
          delayMs={baseDelay + 40}
          className="mt-2 h-2.5 w-40 max-w-[70%] rounded"
        />
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-kal-card-muted">
          <KalShimmerBlock
            delayMs={baseDelay + 50}
            className="h-full w-[42%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

function SyllabusSkeletonBody({
  showStatus = true,
  showPageTitle = false,
  className,
}: {
  showStatus?: boolean;
  showPageTitle?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx("space-y-4 pb-4", className)}
      aria-busy="true"
      aria-label="Loading syllabus"
    >
      {showPageTitle ? <SyllabusPageHeader /> : null}
      <SyllabusOverviewSkeleton />
      {showStatus ? (
        <p
          className="text-center text-xs text-kal-muted"
          role="status"
          aria-live="polite"
        >
          Loading your syllabus and progress…
        </p>
      ) : null}
      <SyllabusToolbarSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <SubjectCardSkeleton key={i} staggerIndex={i} />
        ))}
      </div>
    </div>
  );
}

/** Shimmer layout matching Syllabus Tracker overview + collapsed subject cards. */
export function SyllabusPageSkeleton({
  showChrome = false,
  showStatus = true,
  className,
}: SyllabusPageSkeletonProps) {
  const content = (
    <SyllabusSkeletonBody
      showStatus={showStatus}
      showPageTitle={showChrome}
      className={className}
    />
  );

  if (!showChrome) {
    return content;
  }

  return (
    <div
      className="kal-chrome-root flex h-dvh flex-col overflow-hidden bg-kal-page text-kal-text"
      aria-busy="true"
      aria-label="Loading"
    >
      <header className="kal-glass-header sticky top-0 z-40 shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex h-[52px] w-full items-center justify-between gap-2 px-3 sm:h-[52px] sm:px-5">
          <KalnehiMark
            aria-hidden
            className="h-7 w-auto max-w-[min(100%,6.5rem)] object-contain object-left sm:h-8"
          />
          <div className="flex items-center gap-1">
            <KalShimmerBlock className="size-8 rounded-xl" />
            <KalShimmerBlock className="size-8 rounded-xl" delayMs={30} />
            <KalShimmerBlock className="size-8 rounded-xl" delayMs={60} />
          </div>
        </div>
      </header>

      <div className="kal-chrome-body flex min-w-0 flex-1 overflow-hidden">
        <div className="kal-chrome-main-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
          <main
            className={clsx(
              "mx-auto w-full flex-1 px-4 pt-6 sm:px-6 sm:pt-8",
              "max-w-[960px]",
              "md:px-8 xl:pt-10",
              "pb-[calc(3.5rem+var(--kal-safe-bottom))] lg:pb-10",
            )}
          >
            {content}
          </main>
        </div>
      </div>

      <nav
        className="kal-glass-header fixed bottom-0 left-0 right-0 z-50 shrink-0 border-t border-kal-border/60 pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-hidden
      >
        <div className="flex min-h-14 items-center justify-around gap-1 px-2">
          {Array.from({ length: 6 }, (_, i) => (
            <KalShimmerBlock
              key={i}
              delayMs={i * 40}
              className="h-8 w-10 rounded-lg"
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
