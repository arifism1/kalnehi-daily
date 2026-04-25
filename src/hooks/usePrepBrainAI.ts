"use client";

import { useCallback, useEffect, useState } from "react";

import { prepbrainLimitReachedMessageForUi } from "@/lib/prepbrainLimitUserFacing";
import type { AiUsagePhase, PrepBrainUsagePayload } from "@/lib/prepbrainTokens";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { surfaceOptionalString } from "@/lib/userFacingErrors";
import { useAuthStore } from "@/store/useAuthStore";

export type PrepBrainChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PrepBrainConversationSummary = {
  id: string;
  title: string | null;
  updated_at: string;
};

const CONVERSATIONS_LIST_LIMIT = 30;

export function usePrepBrainAI() {
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<PrepBrainChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<PrepBrainConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<PrepBrainUsagePayload | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  /** Last Groq model id returned by the API (for dev/debug UI). */
  const [lastGroqModel, setLastGroqModel] = useState<string | null>(null);

  const refreshConversations = useCallback(async () => {
    if (!user?.id) {
      setConversations([]);
      return;
    }
    setConversationsLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: qErr } = await supabase
      .from("prepbrain_conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(CONVERSATIONS_LIST_LIMIT);
    setConversationsLoading(false);
    if (qErr) {
      console.error("[PrepBrain] list conversations", qErr);
      return;
    }
    if (data) {
      setConversations(
        data.map((r) => ({
          id: r.id,
          title: r.title,
          updated_at: r.updated_at,
        })),
      );
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    let cancelled = false;
    setUsageLoading(true);
    void fetch("/api/prepbrain/usage", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(
        (res) =>
          res.json() as Promise<{
            ok?: boolean;
            usage?: PrepBrainUsagePayload;
            phase?: AiUsagePhase;
          }>,
      )
      .then((data) => {
        if (cancelled) return;
        if (data.ok && data.usage) {
          const phase: AiUsagePhase =
            data.usage.phase ?? data.phase ?? "none";
          setUsage({ ...data.usage, phase });
        } else setUsage(null);
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

  const newChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setLastGroqModel(null);
  }, []);

  const openConversation = useCallback(async (id: string) => {
    if (!user?.id) return;
    setHistoryLoading(true);
    setError(null);
    setConversationId(id);
    const supabase = getSupabaseBrowserClient();
    const { data, error: qErr } = await supabase
      .from("prepbrain_messages")
      .select("message_role, content, position")
      .eq("conversation_id", id)
      .order("position", { ascending: true });
    setHistoryLoading(false);
    if (qErr) {
      setError("Could not load this chat. Try again.");
      return;
    }
    const msgs: PrepBrainChatMessage[] = (data ?? []).map((row) => ({
      role: row.message_role as PrepBrainChatMessage["role"],
      content: row.content,
    }));
    setMessages(msgs);
  }, [user?.id]);

  const deleteConversation = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/prepbrain/conversations/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(
          surfaceOptionalString(data.error, "Could not delete chat. Try again."),
        );
        return;
      }
      if (conversationId === id) {
        newChat();
      }
      void refreshConversations();
    },
    [conversationId, newChat, refreshConversations],
  );

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
            ...(conversationId ? { conversationId } : {}),
          }),
        });

        const contentType = res.headers.get("content-type") ?? "";
        if (res.ok && contentType.includes("text/event-stream") && res.body) {
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let streamOk = true;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const events = buf.split("\n\n");
            buf = events.pop() ?? "";
            for (const raw of events) {
              for (const line of raw.split("\n")) {
                const t = line.trim();
                if (!t.startsWith("data: ")) continue;
                let payload: {
                  type?: string;
                  delta?: string;
                  ok?: boolean;
                  error?: string;
                  message?: string;
                  usage?: PrepBrainUsagePayload;
                  groq_model?: string;
                  conversation_id?: string | null;
                };
                try {
                  payload = JSON.parse(t.slice(6)) as typeof payload;
                } catch {
                  continue;
                }
                if (payload.type === "chunk" && typeof payload.delta === "string") {
                  setMessages((prev) => {
                    const next = [...prev];
                    const lastM = next[next.length - 1];
                    if (lastM?.role === "assistant") {
                      next[next.length - 1] = {
                        role: "assistant",
                        content: lastM.content + payload.delta,
                      };
                    }
                    return next;
                  });
                } else if (payload.type === "done") {
                  if (payload.ok === false) {
                    setMessages((p) => p.slice(0, -2));
                    const u = payload.usage;
                    const tokenBlocked =
                      u != null && u.limit > 0 && u.used >= u.limit;
                    if (tokenBlocked) {
                      setError(null);
                    } else {
                      setError(
                        surfaceOptionalString(
                          payload.error,
                          "Could not reach Mastermind. Try again.",
                        ),
                      );
                    }
                  } else {
                    if (payload.usage) {
                      const phase: AiUsagePhase =
                        payload.usage.phase ?? "none";
                      setUsage({ ...payload.usage, phase });
                    }
                    if (typeof payload.groq_model === "string" && payload.groq_model) {
                      setLastGroqModel(payload.groq_model);
                      console.log(`[PrepBrain] Using model: ${payload.groq_model}`);
                    }
                    if (typeof payload.conversation_id === "string" && payload.conversation_id) {
                      setConversationId(payload.conversation_id);
                    }
                    void refreshConversations();
                  }
                }
              }
            }
          }
        } else {
          const data = (await res.json()) as {
            ok?: boolean;
            message?: string;
            error?: string;
            usage?: PrepBrainUsagePayload;
            groq_model?: string;
            conversation_id?: string | null;
          };
          if (data.usage) {
            const phase: AiUsagePhase = data.usage.phase ?? "none";
            setUsage({ ...data.usage, phase });
          }
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
              setError(
                surfaceOptionalString(
                  data.error,
                  "Could not reach Mastermind. Try again.",
                ),
              );
            }
            return;
          }
          if (typeof data.groq_model === "string" && data.groq_model) {
            setLastGroqModel(data.groq_model);
            console.log(`[PrepBrain] Using model: ${data.groq_model}`);
          }
          if (typeof data.conversation_id === "string" && data.conversation_id) {
            setConversationId(data.conversation_id);
          }
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
          void refreshConversations();
        }
      } catch {
        setMessages((prev) => {
          const n = prev.length;
          if (n >= 2) {
            const a = prev[n - 1];
            const u = prev[n - 2];
            if (u.role === "user" && a.role === "assistant") {
              return prev.slice(0, -2);
            }
          }
          return prev.slice(0, -1);
        });
        setError("Network error. Check your connection and try again.");
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages, conversationId, refreshConversations],
  );

  const atTokenLimit =
    usage != null && usage.limit > 0 && usage.used >= usage.limit;

  const tokenLimitMessage = atTokenLimit && usage
    ? prepbrainLimitReachedMessageForUi(usage.phase)
    : null;

  return {
    messages,
    isSending,
    error,
    setError,
    sendMessage,
    /** Start a fresh thread (clears the composer view; past chats stay in the list until deleted). */
    newChat,
    /** @deprecated Use newChat — same behavior. */
    clearChat: newChat,
    conversationId,
    conversations,
    conversationsLoading,
    historyLoading,
    refreshConversations,
    openConversation,
    deleteConversation,
    usage,
    usageLoading,
    atTokenLimit,
    tokenLimitMessage,
    lastGroqModel,
  };
}
