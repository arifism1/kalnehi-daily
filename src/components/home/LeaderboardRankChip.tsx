"use client";

import { useEffect, useState } from "react";
import { getAnonymousLeaderboardLine } from "@/actions/leaderboard";

export function LeaderboardRankChip() {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await getAnonymousLeaderboardLine();
      if (!r.ok) {
        setLine(null);
        return;
      }
      const t = r.data.topPercent;
      if (t == null) {
        setLine(
          r.data.hasSnapshot
            ? "Cohort is still small — your rank will firm up soon."
            : "Study this week to claim your first anonymous rank.",
        );
        return;
      }
      setLine(`You’re in the top ${t}% of ${r.data.examGroupLabel} this week.`);
    })();
  }, []);

  if (!line) {
    return null;
  }

  return (
    <p className="text-[11px] font-semibold text-kal-accent">{line}</p>
  );
}
