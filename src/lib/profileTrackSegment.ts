import { trackById } from "@/lib/examTracks";

/**
 * Admin / analytics: one row per user, keyed by track when set, else legacy primary exam.
 */
export function adminSegmentLabelFromProfile(p: {
  selected_track?: string | null;
  target_exam?: string | null;
  primary_exam?: string | null;
}): string {
  const tid = p.selected_track?.trim();
  if (tid) {
    const t = trackById(tid);
    if (t) return t.name;
    return `Track (${tid})`;
  }
  return (p.target_exam || p.primary_exam || "Unknown").trim() || "Unknown";
}

/**
 * True when the user has a track chosen or a legacy single-exam goal.
 */
export function profileHasExamGoalSet(p: {
  selected_track?: string | null;
  target_exam?: string | null;
  primary_exam?: string | null;
}): boolean {
  return Boolean(
    p.selected_track?.trim() || p.target_exam?.trim() || p.primary_exam?.trim(),
  );
}

/**
 * Email copy: full subject for retargeting, e.g. "Your JEE Track preparation" or
 * "Your preparation" when no exam/goal is stored.
 */
export function yourPreparationSubjectPhrase(p: {
  selected_track?: string | null;
  target_exam?: string | null;
  primary_exam?: string | null;
}): string {
  const tid = p.selected_track?.trim();
  if (tid) {
    const t = trackById(tid);
    if (t) return `Your ${t.name} preparation`;
  }
  const ex = (p.target_exam || p.primary_exam || "").trim();
  if (ex) return `Your ${ex} preparation`;
  return "Your preparation";
}
