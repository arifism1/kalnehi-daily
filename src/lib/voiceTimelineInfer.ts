import type { VoiceTimelineCategory } from "@/lib/voiceDayParse";

/**
 * Client-safe helpers (shared by voice Dictate actions and planner auto-save).
 */

export function inferCategoryFromTaskName(name: string): VoiceTimelineCategory {
  const n = name.toLowerCase();
  if (
    /break|rest|relax|chai|coffee|sleep|snack|walk|stretch|खाना|^meal|lunch|dinner|breakfast|nashta|खा/.test(
      n,
    )
  ) {
    if (/lunch|dinner|breakfast|meal|खाना|nashta|खा लूँगा|खा रहा/.test(n))
      return "meal";
    return "break";
  }
  if (/travel|commute|metro|bus|auto|cab|journey|रास्ते|आने|जाने/.test(n))
    return "commute";
  if (
    /mock|pyq|pyqs|test series|full test|exam|neet|jee|paper|nta|omr/.test(n)
  ) {
    return "exam_prep";
  }
  if (
    /study|read|revise|revision|chapter|physics|chemistry|bio|biology|maths|math|organic|inorganic|mechanics|rotation|kinematics|dpp|ncert|module|backlog|practice|solve|questions|numericals|lec|lecture|coaching|class/.test(
      n,
    )
  ) {
    return "study";
  }
  if (/bath|brush|shower|wash|hygiene|कपड़े|कपडा/.test(n)) return "hygiene";
  if (/family|call|friend|personal|mom|dad|घर|phone/.test(n))
    return "personal";
  return "other";
}

export function buildScheduleDescription(
  start: string | null,
  end: string | null,
): string {
  if (start && end) {
    return `Scheduled ${start}–${end} IST.`;
  }
  if (start) {
    return `Starting ${start} IST (no end time).`;
  }
  if (end) {
    return `Until ${end} IST.`;
  }
  return "Time not specified in voice note — tap Edit to add times.";
}
