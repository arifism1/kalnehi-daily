"use client";

import { useCallback } from "react";

import { useAiGate } from "@/hooks/useAiGate";
import type { VoiceCommandIntent } from "@/lib/voiceCommandGroq";

export type VoiceCommandApiResponse = {
  ok: boolean;
  error?: string;
  intent?: VoiceCommandIntent;
  response_text?: string;
  voice_seconds_charged?: number;
};

/**
 * Boss Mode: centralized voice credit gate + `/api/voice-command` submit.
 * Credits remain authoritative on the server (`ensureVoiceMinuteHeadroom` + `incrementVoiceMinuteUsage`).
 */
export function useVoiceCommand() {
  const aiGate = useAiGate();

  const checkBalance = useCallback((): { allowed: boolean; reason?: string } => {
    if (aiGate.loading) {
      return { allowed: false, reason: "Checking your subscription…" };
    }
    if (!aiGate.canDoVoiceSession) {
      return { allowed: false, reason: aiGate.voiceMinuteStatus };
    }
    return { allowed: true };
  }, [aiGate.loading, aiGate.canDoVoiceSession, aiGate.voiceMinuteStatus]);

  const submitVoiceCommand = useCallback(
    async (
      transcript: string,
      pageContext: string,
      durationSeconds: number,
      signal: AbortSignal,
    ): Promise<{ ok: false; error: string; status: number } | { ok: true; data: VoiceCommandApiResponse }> => {
      const res = await fetch("/api/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transcript,
          page_context: pageContext,
          durationSeconds,
        }),
        signal,
      });

      const data = (await res.json()) as VoiceCommandApiResponse;

      if (!data.ok) {
        const isQuota = data.error === "quota_exceeded" || res.status === 429;
        return {
          ok: false,
          status: res.status,
          error: isQuota
            ? "You've used your voice time for this month. Get more from My Subscription."
            : (data.error ?? "Something went wrong. Please try again."),
        };
      }

      if (!data.intent || !data.response_text) {
        return {
          ok: false,
          status: res.status,
          error: "Couldn't parse that command. Please try again.",
        };
      }

      return { ok: true, data };
    },
    [],
  );

  return { checkBalance, submitVoiceCommand, aiGate };
}
