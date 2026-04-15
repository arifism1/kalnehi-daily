"use client";

import { useCallback, useEffect, useState } from "react";

import {
  prepbrainLimitReachedMessage,
  type PrepBrainUsagePayload,
} from "@/lib/prepbrainTokens";
import { useAuthStore } from "@/store/useAuthStore";

export type PrepBrainChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function usePrepBrainAI() {
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<PrepBrainChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<PrepBrainUsagePayload | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  /** Last Groq model id returned by the API (for dev/debug UI). */
  const [lastGroqModel, setLastGroqModel] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setUsage(null);
      setUsageLoading(false);
      return;
    }
    let cancelled = false;
    setUsageLoading(true);
    void fetch("/api/prepbrain/usage", { credentials: "same-origin" })
      .then((res) => res.json() as Promise<{ ok?: boolean; usage?: PrepBrainUsagePayload }>)
      .then((data) => {
        if (cancelled) return;
        if (data.ok && data.usage) setUsage(data.usage);
        else setUsage(null);
      })
      .catch(() => {
        if (!cancelled) setUsage(null);
      })
      .finally(() => {
        if (!cancelled) setUsageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userMsg: PrepBrainChatMessage = { role: "user", content: trimmed };
      const threadForApi: PrepBrainChatMessage[] = [...messages, userMsg];
      setMessages(threadForApi);
      setError(null);
      setIsSending(true);

      try {
        const res = await fetch("/api/prepbrain/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            messages: threadForApi,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          error?: string;
          usage?: PrepBrainUsagePayload;
          groq_model?: string;
        };
        if (data.usage) setUsage(data.usage);
        const reply = data.message;
        if (!res.ok || !data.ok || typeof reply !== "string" || !reply) {
          setMessages((prev) => prev.slice(0, -1));
          const tokenBlocked =
            res.status === 403 &&
            data.usage != null &&
            data.usage.limit > 0 &&
            data.usage.used >= data.usage.limit;
          if (tokenBlocked) {
            setError(null);
          } else {
            setError(data.error ?? "Could not reach PrepBrain. Try again.");
          }
          return;
        }
        if (typeof data.groq_model === "string" && data.groq_model) {
          setLastGroqModel(data.groq_model);
          console.log(`[PrepBrain] Using model: ${data.groq_model}`);
        }
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch {
        setMessages((prev) => prev.slice(0, -1));
        setError("Network error. Check your connection and try again.");
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setLastGroqModel(null);
  }, []);

  const atTokenLimit =
    usage != null && usage.limit > 0 && usage.used >= usage.limit;

  const tokenLimitMessage = atTokenLimit
    ? prepbrainLimitReachedMessage(usage.tier)
    : null;

  return {
    messages,
    isSending,
    error,
    setError,
    sendMessage,
    clearChat,
    usage,
    usageLoading,
    atTokenLimit,
    tokenLimitMessage,
    lastGroqModel,
  };
}
