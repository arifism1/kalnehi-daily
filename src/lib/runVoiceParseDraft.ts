import { fetchVoiceTasksFromGroq } from "@/lib/voiceDictateGroq";
import {
  groqTasksToVoiceDraftTasks,
  type VoiceDraftTask,
} from "@/lib/voiceDraftFromGroq";

export type ParseVoiceDraftResult =
  | { ok: true; tasks: VoiceDraftTask[]; inputTokens: number; outputTokens: number; model: string }
  | { ok: false; error: string; openRawFallback?: boolean; inputTokens: number; outputTokens: number; model: string };

/**
 * Shared by server action + /api/voice-parse-draft. No DB or auth.
 */
export async function runVoiceParseDraft(
  raw: string,
  logDate: string,
  occurredAt: string,
): Promise<ParseVoiceDraftResult> {
  const groq = await fetchVoiceTasksFromGroq(
    raw,
    {
      referenceIso: occurredAt,
      logDate,
    },
    { strictParsedTasks: true },
  );

  const tokenMeta = { inputTokens: groq.inputTokens, outputTokens: groq.outputTokens, model: groq.model };

  if (groq.outcome === "fallback") {
    const hasKey = Boolean(process.env.GROQ_API_KEY?.trim());
    return {
      ok: false,
      error: hasKey
        ? "Could not reach the voice parser (empty transcript or server misconfiguration)."
        : "Voice structuring needs GROQ_API_KEY on the server. You can still save the note below as raw text.",
      openRawFallback: true,
      ...tokenMeta,
    };
  }
  if (groq.outcome === "parse_failed") {
    return {
      ok: false,
      error:
        "Could not turn that into tasks. Try again, or save the note as raw text below.",
      openRawFallback: true,
      ...tokenMeta,
    };
  }

  const tasks = groqTasksToVoiceDraftTasks(groq.tasks);
  if (tasks.length === 0) {
    return {
      ok: false,
      error: "No tasks extracted. Try again or save as raw text below.",
      openRawFallback: true,
      ...tokenMeta,
    };
  }
  return { ok: true, tasks, ...tokenMeta };
}
