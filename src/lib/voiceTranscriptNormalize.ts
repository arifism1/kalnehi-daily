/**
 * Web Speech / mobile dictation often glues tokens ("from1 30", "amI").
 * Light cleanup before sending to Groq improves time + task splitting.
 */
export function normalizeVoiceTranscriptForParsing(input: string): string {
  let t = input.trim();
  if (!t) return t;
  // digit ↔ letter boundaries (from1 30 → from 1 30)
  t = t.replace(/(\d)([a-zA-Z])/g, "$1 $2");
  t = t.replace(/([a-zA-Z])(\d)/g, "$1 $2");
  // am/pm stuck to next word (amI need → am I need)
  t = t.replace(/\b(am|pm)([a-zA-Z])/gi, "$1 $2");
  // common fused units
  t = t.replace(/\b(\d+)\s*(h|hr|hrs|hour|hours|min|mins|minutes)\b/gi, "$1 $2");
  t = t.replace(/\s+/g, " ");
  return t.trim();
}
