import clsx from "clsx";
import { BookOpen, Sparkles } from "lucide-react";

type Props = {
  /** User-facing exam label, e.g. "JEE Advanced" or "CBSE Boards". */
  examLabel: string;
  className?: string;
  variant?: "page" | "compact";
};

export function SyllabusComingSoon({
  examLabel,
  className,
  variant = "page",
}: Props) {
  const compact = variant === "compact";

  return (
    <div
      className={clsx(!compact && "mx-auto w-full max-w-lg", className)}
    >
      <div
        className={clsx(
          "relative overflow-hidden border border-kal-accent/25 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-red-950/30 shadow-xl shadow-red-900/20",
          compact ? "rounded-2xl px-4 py-5 sm:px-5 sm:py-6" : "rounded-3xl px-6 py-12 sm:px-10 sm:py-14",
        )}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-kal-accent/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-red-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col items-center text-center">
          <div
            className={clsx(
              "flex items-center justify-center rounded-2xl border border-kal-accent/35 bg-kal-accent/10",
              compact ? "h-14 w-14" : "h-20 w-20",
            )}
          >
            {compact ? (
              <BookOpen
                className="h-7 w-7 text-kal-accent"
                strokeWidth={1.75}
                aria-hidden
              />
            ) : (
              <Sparkles
                className="h-10 w-10 text-kal-accent"
                strokeWidth={1.5}
                aria-hidden
              />
            )}
          </div>

          <p className="mt-6 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kal-accent/90">
            Syllabus tracker
          </p>
          <h1
            className={clsx(
              "mt-2 font-bold tracking-tight text-white",
              compact ? "text-lg sm:text-xl" : "text-2xl sm:text-[1.65rem]",
            )}
          >
            Coming soon
          </h1>
          <p
            className={clsx(
              "mt-4 max-w-md leading-relaxed text-zinc-400",
              compact ? "text-sm" : "text-[15px] sm:text-base",
            )}
          >
            <span className="font-medium text-red-200/95">
              {examLabel} syllabus is coming soon.
            </span>{" "}
            We are working hard to bring full support for your exam — NEET UG and
            JEE Main are already here when you pick them in Profile.
          </p>
          <p className="mt-5 text-xs leading-relaxed text-zinc-500">
            Planner, doubts, and daily execution stay fully available. Switch your
            target exam anytime to use a live catalog when it&apos;s ready.
          </p>
        </div>
      </div>
    </div>
  );
}
