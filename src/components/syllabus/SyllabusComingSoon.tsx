import clsx from "clsx";
import { Sparkles } from "lucide-react";

type Props = {
  /** Catalog display name, e.g. "GATE" or "CUET UG". */
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
          "kal-glass-panel relative overflow-hidden border border-kal-border bg-gradient-to-br from-kal-accent-soft/70 via-kal-card to-kal-card-muted/90 kal-shadow-card",
          "dark:border-white/12 dark:from-kal-accent-soft/25 dark:via-kal-card dark:to-kal-card-muted/80",
          compact ? "rounded-2xl px-4 py-5 sm:px-5 sm:py-6" : "rounded-3xl px-6 py-12 sm:px-10 sm:py-14",
        )}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-kal-accent/15 blur-3xl dark:bg-kal-accent/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-red-400/10 blur-3xl dark:bg-red-500/10"
          aria-hidden
        />

        <div className="relative flex flex-col items-center text-center">
          <div
            className={clsx(
              "flex items-center justify-center rounded-2xl border border-kal-accent/25 bg-kal-card shadow-sm ring-1 ring-kal-border/80 dark:bg-kal-card-muted/60",
              compact ? "h-14 w-14" : "h-20 w-20",
            )}
          >
            <Sparkles
              className={clsx(
                "text-kal-accent",
                compact ? "h-7 w-7" : "h-10 w-10",
              )}
              strokeWidth={1.5}
              aria-hidden
            />
          </div>

          <p className="mt-6 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kal-accent">
            Coming soon
          </p>
          <h1 className="kal-feature-title mt-2">{examLabel}</h1>
          <p
            className={clsx(
              "mt-4 max-w-md leading-relaxed text-kal-text-secondary",
              compact ? "text-sm" : "text-[15px] sm:text-base",
            )}
          >
            Full syllabus, chapter-wise marks weightage, Target Score Blueprint,
            and smart planning for{" "}
            <span className="font-semibold text-kal-accent">{examLabel}</span>{" "}
            is coming soon.
          </p>
          <p
            className={clsx(
              "mt-4 max-w-md leading-relaxed text-kal-muted",
              compact ? "text-sm" : "text-[15px] sm:text-base",
            )}
          >
            We&apos;re working hard to bring a tailored experience for{" "}
            <span className="font-medium text-kal-text">{examLabel}</span>{" "}
            aspirants.
          </p>
        </div>
      </div>
    </div>
  );
}
