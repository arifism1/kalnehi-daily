"use client";

export type StudySquadToggleProps = {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  /** Accessible label when squad feed is off */
  labelOff?: string;
  /** Accessible label when squad feed is on */
  labelOn?: string;
};

export function StudySquadToggle({
  pressed,
  onPressedChange,
  labelOff = "Study with Team — off",
  labelOn = "Study with Team — on",
}: StudySquadToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      onClick={() => onPressedChange(!pressed)}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full border border-kal-border-strong bg-kal-card/90 px-4 py-2.5 text-xs font-semibold text-kal-text shadow-md backdrop-blur-xl transition-colors hover:bg-kal-card-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-kal-page"
    >
      <span
        className={`size-2 rounded-full ${
          pressed
            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
            : "bg-kal-muted"
        }`}
        aria-hidden
      />
      <span className="whitespace-nowrap">{pressed ? "Team live" : "Study with Team"}</span>
      <span className="sr-only">{pressed ? labelOn : labelOff}</span>
    </button>
  );
}
