/**
 * Pure XP / rank math (client or server).
 */

export const XP_REWARDS = {
  task_complete: 10,
  mock_logged: 50,
  revision_done: 20,
  streak_7: 100,
  streak_30: 500,
  streak_100: 2000,
  milestone_mock_target: 150,
} as const;

export type XpEventType = keyof typeof XP_REWARDS;

export function levelFromTotalXp(xp: number): number {
  return Math.max(1, Math.min(99, 1 + Math.floor(Math.max(0, xp) / 100)));
}

export type RankTier = "Recruit" | "Warrior" | "Champion" | "Legend" | "Elite";

export function rankTierFromXp(xp: number): { tier: RankTier; subRank: number; label: string } {
  const t = Math.max(0, xp);
  if (t < 100) {
    return { tier: "Recruit", subRank: Math.min(5, 1 + Math.floor(t / 20)), label: "Recruit" };
  }
  if (t < 300) {
    const w = t - 100;
    return {
      tier: "Warrior",
      subRank: Math.min(5, 1 + Math.floor(w / 40)),
      label: "Warrior",
    };
  }
  if (t < 700) {
    return {
      tier: "Champion",
      subRank: Math.min(5, 1 + Math.floor((t - 300) / 80)),
      label: "Champion",
    };
  }
  if (t < 1500) {
    return {
      tier: "Legend",
      subRank: Math.min(5, 1 + Math.floor((t - 700) / 160)),
      label: "Legend",
    };
  }
  return { tier: "Elite", subRank: Math.min(5, 1 + Math.floor((t - 1500) / 200)), label: "Elite" };
}

export function formatRankHeadline(xp: number, level: number): string {
  const { label, subRank } = rankTierFromXp(xp);
  return `Rank ${subRank} ${label} · L${level}`;
}
