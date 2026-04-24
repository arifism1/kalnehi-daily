"use client";

import { StreakFlame } from "@/components/ui/StreakFlame";

const MSGS: { max: number; text: (n: number) => string }[] = [
  { max: 0, text: () => "Start a streak today — one solid day is enough to begin." },
  { max: 1, text: (n) => `Day ${n} locked in. Now turn it into a pattern.` },
  { max: 2, text: (n) => `${n} days in a row. You’re already ahead of most people.` },
  { max: 6, text: (n) => `${n} days straight. Most students quit by day 3. You didn’t.` },
  { max: 13, text: (n) => `Two weeks: ${n} days of proof that you can stay with it.` },
  { max: 29, text: (n) => `${n} days. Consistency is your unfair advantage.` },
  { max: 99, text: (n) => `${n} days. This is the discipline they’ll ask you about later.` },
  { max: 999, text: (n) => `${n} days. You’ve built a machine.` },
];

function copy(streak: number): string {
  for (const m of MSGS) {
    if (streak <= m.max) return m.text(streak);
  }
  return MSGS[MSGS.length - 1]!.text(streak);
}

type StreakPersonalityProps = {
  streak: number;
  className?: string;
};

export function StreakPersonality({ streak, className = "" }: StreakPersonalityProps) {
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-sm text-kal-text ${className}`}
    >
      <StreakFlame streak={streak} className="shrink-0 pt-0.5" />
      <p className="min-w-0 flex-1 leading-snug">{copy(streak)}</p>
    </div>
  );
}
