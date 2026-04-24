"use client";

import Link from "next/link";

import { useLiveTargetBar } from "@/hooks/useLiveTargetBar";

/**
 * Persistent strip: marginal progress toward saved target score (blueprint).
 */
export function LiveTargetBar() {
  const model = useLiveTargetBar();

  if (!model.visible) {
    if (model.reason === "no_blueprint") {
      return (
        <div className="border-b border-kal-border/60 bg-kal-accent/[0.07] px-3 py-1.5 sm:px-5">
          <p className="text-center text-[11px] leading-snug text-kal-text-secondary sm:text-xs">
            <Link
              href="/target-score-blueprint"
              className="font-semibold text-kal-accent underline-offset-2 hover:underline"
            >
              Set a target score
            </Link>{" "}
            to see today&apos;s live progress toward it.
          </p>
        </div>
      );
    }
    return null;
  }

  const { percentToday, targetScore } = model;
  const pctLabel =
    percentToday < 0.05 ? "<0.1" : percentToday.toFixed(1).replace(/\.0$/, "");

  return (
    <div
      className="border-b border-kal-border/60 bg-gradient-to-r from-kal-accent/[0.08] via-kal-accent/[0.04] to-kal-accent/[0.08] px-3 py-1.5 sm:px-5"
      aria-live="polite"
    >
      <p className="text-center text-[11px] font-medium leading-snug text-kal-text sm:text-xs">
        Today gets you{" "}
        <span className="tabular-nums text-kal-accent">{pctLabel}%</span> closer
        to{" "}
        <span className="tabular-nums text-kal-text">{targetScore}</span>.
      </p>
    </div>
  );
}
