"use client";

import { useCallback, useEffect, useState } from "react";

import { buildPrepBrainContext, type PrepBrainContext } from "@/lib/prepBrainContext";
import {
  prepbrainLimitReachedMessage,
  type PrepBrainUsagePayload,
} from "@/lib/prepbrainTokens";
import { getHabitBundleCached } from "@/lib/habitLocal";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getAllExecutionSessions } from "@/lib/taskIdb";
import { getAllStudySessions } from "@/lib/studySessionsIdb";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { useTargetExamDate } from "@/hooks/useTargetExamDate";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";

export type PrepBrainChatMessage = {
  role: "user" | "assistant";
  content: string;
};

async function fetchMeditation30d(userId: string): Promise<{
  sessionCount: number;
  distinctDays: number;
}> {
  try {
    const supabase = getSupabaseBrowserClient();
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const ymd = since.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("meditation_sessions")
      .select("date")
      .eq("user_id", userId)
      .gte("date", ymd);
    if (error || !data) return { sessionCount: 0, distinctDays: 0 };
    const days = new Set(data.map((r) => r.date));
    return { sessionCount: data.length, distinctDays: days.size };
  } catch {
    return { sessionCount: 0, distinctDays: 0 };
  }
}

export function usePrepBrainAI() {
  const user = useAuthStore((s) => s.user);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microtopics = useTaskStore((s) => s.microtopics);
  const calendarToday = useCalendarDate();
  const { examLabel, examDisplayName } = useTargetExamDisplay();
  const { examDate: targetExamDate } = useTargetExamDate();
  const {
    rollup,
    neetYearProjections,
    cuetScoringRollup,
    maxScore,
    primaryMarksYear,
  } = useSyllabusTracker();

  const [messages, setMessages] = useState<PrepBrainChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<PrepBrainUsagePayload | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

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

  const buildContextSnapshot = useCallback(async (): Promise<PrepBrainContext> => {
    const tasks = Object.values(tasksRecord);
    const nowIso = new Date().toISOString();

    const [executionSessions, studySessions, habitBundle, meditation30d] =
      await Promise.all([
        getAllExecutionSessions(),
        getAllStudySessions(),
        user?.id ? getHabitBundleCached(user.id) : Promise.resolve(null),
        user?.id ? fetchMeditation30d(user.id) : Promise.resolve({ sessionCount: 0, distinctDays: 0 }),
      ]);

    return buildPrepBrainContext({
      nowIso,
      calendarToday,
      examLabel,
      examDisplayName,
      targetExamDate,
      maxScore,
      primaryMarksYear,
      rollup,
      neetYearProjections,
      cuetScoringRollup,
      tasks,
      microtopicById: microtopics,
      executionSessions,
      studySessions,
      habitBundle,
      meditation30d,
    });
  }, [
    tasksRecord,
    microtopics,
    calendarToday,
    examLabel,
    examDisplayName,
    targetExamDate,
    maxScore,
    primaryMarksYear,
    rollup,
    neetYearProjections,
    cuetScoringRollup,
    user?.id,
  ]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userMsg: PrepBrainChatMessage = { role: "user", content: trimmed };
      let threadForApi: PrepBrainChatMessage[] = [];
      setMessages((prev) => {
        threadForApi = [...prev, userMsg];
        return threadForApi;
      });
      setError(null);
      setIsSending(true);

      try {
        const context = await buildContextSnapshot();
        const res = await fetch("/api/prepbrain/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            messages: threadForApi,
            context,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          error?: string;
          usage?: PrepBrainUsagePayload;
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
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch {
        setMessages((prev) => prev.slice(0, -1));
        setError("Network error. Check your connection and try again.");
      } finally {
        setIsSending(false);
      }
    },
    [buildContextSnapshot, isSending],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
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
    buildContextSnapshot,
    usage,
    usageLoading,
    atTokenLimit,
    tokenLimitMessage,
  };
}
