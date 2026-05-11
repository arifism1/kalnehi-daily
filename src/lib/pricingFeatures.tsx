import { Check, Minus } from "lucide-react";

export type FeatureValue = boolean | string | null;

/** Trial vs Smart Plan comparison rows — single source for desktop table + mobile tabs. */
export const PRICING_FEATURES: { name: string; trial: FeatureValue; smart: FeatureValue }[] = [
  { name: "Plan your day with voice", trial: true, smart: true },
  { name: "Syllabus tracker", trial: true, smart: true },
  { name: "Focus timer + study camera", trial: true, smart: true },
  { name: "Streak + consistency heatmap", trial: true, smart: true },
  { name: "Doubt tracker", trial: true, smart: true },
  { name: "Marks engine + rank prediction", trial: true, smart: true },
  { name: "Revision Tracker", trial: true, smart: true },
  { name: "Daily log & prep insights", trial: true, smart: true },
  { name: "Mastermind Strategy Coach", trial: true, smart: true },
  { name: "Voice control", trial: "5 min total", smart: "100 min/month" },
  { name: "Mastermind tokens", trial: "60,000 total", smart: "20,00,000/month" },
];

type FeatureCellProps = {
  value: FeatureValue;
  /** `desktop`: centered table cells. `mobile`: compact row icons. */
  variant?: "desktop" | "mobile";
};

export function FeatureCell({ value, variant = "desktop" }: FeatureCellProps) {
  if (variant === "mobile") {
    if (value === true)
      return (
        <Check
          className="h-4 w-4 text-emerald-500 dark:text-emerald-400"
          strokeWidth={2.5}
          aria-label="Included"
        />
      );
    if (value === false || value === null)
      return <Minus className="h-4 w-4 text-kal-muted/50" strokeWidth={2} aria-label="Not included" />;
    return <span className="text-xs font-semibold tabular-nums text-kal-text">{value}</span>;
  }

  if (value === true)
    return (
      <span className="flex justify-center">
        <Check
          className="h-5 w-5 text-emerald-500 dark:text-emerald-400"
          strokeWidth={2.5}
          aria-label="Included"
        />
      </span>
    );
  if (value === false || value === null)
    return (
      <span className="flex justify-center">
        <Minus className="h-4 w-4 text-kal-muted/50" strokeWidth={2} aria-label="Not included" />
      </span>
    );
  return (
    <span className="block text-center text-xs font-semibold tabular-nums text-kal-text">
      {value}
    </span>
  );
}
