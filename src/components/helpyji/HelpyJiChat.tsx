"use client";

import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";

import { GroqModelDebugBadge } from "@/components/ai/GroqModelDebugBadge";
import { useAiModelDebugVisible } from "@/hooks/useAiModelDebugVisible";
import {
  HELPYJI_DISCLAIMER_PRIMARY,
  HELPYJI_TERMS_LINK_LABEL,
  type HelpyJiSurface,
} from "@/lib/helpyjiPrompts";
import { usePrepBrainContextSnapshot } from "@/hooks/usePrepBrainContextSnapshot";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

const STORAGE_PREFIX = "helpyji_thread_v3";

type ChatMsg = { role: "user" | "assistant"; content: string };

function parseHelpyJiSessionThread(raw: string | null): ChatMsg[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const msgs: ChatMsg[] = [];
    for (const m of parsed) {
      if (
        m &&
        typeof m === "object" &&
        (m as ChatMsg).role &&
        typeof (m as ChatMsg).content === "string"
      ) {
        msgs.push(m as ChatMsg);
      }
    }
    return msgs;
  } catch {
    return [];
  }
}

type HelpyJiChatProps = {
  surface: HelpyJiSurface;
  /** When set, the FAB stays hidden until this element intersects the viewport. */
  intersectionAnchorRef?: RefObject<HTMLElement | null>;
};

export function HelpyJiChat({
  surface,
  intersectionAnchorRef,
}: HelpyJiChatProps) {
  const labelId = useId();
  const user = useAuthStore((s) => s.user);
  const { buildContextSnapshot } = usePrepBrainContextSnapshot();

  const [open, setOpen] = useState(false);
  const [fabVisible, setFabVisible] = useState(!intersectionAnchorRef);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [clientCooldownUntil, setClientCooldownUntil] = useState(0);
  const [lastGroqModel, setLastGroqModel] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const showModelDebug = useAiModelDebugVisible();

  const storageKey =
    user?.id != null
      ? `${STORAGE_PREFIX}:${surface}:${user.id}`
      : `${STORAGE_PREFIX}:${surface}:pending`;

  const ensureSessionId = useCallback((): string | null => {
    if (!user?.id || typeof window === "undefined") return null;
    const k = `helpyji_session_v2:${surface}:${user.id}`;
    let sid = sessionStorage.getItem(k);
    if (
      !sid ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        sid,
      )
    ) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(k, sid);
    }
    return sid;
  }, [user?.id, surface]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = sessionStorage.getItem(storageKey);
      const localMsgs = parseHelpyJiSessionThread(raw);

      if (!user?.id) {
        if (localMsgs.length) setMessages(localMsgs);
        return;
      }

      const sessionId = ensureSessionId();
      if (!sessionId) {
        if (localMsgs.length) setMessages(localMsgs);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("helpyji_conversations")
        .select("message_role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        if (localMsgs.length) setMessages(localMsgs);
        return;
      }

      const serverMsgs: ChatMsg[] = (data ?? []).map((row) => ({
        role: row.message_role as ChatMsg["role"],
        content: row.content,
      }));

      const merged: ChatMsg[] = [...serverMsgs];
      for (let k = serverMsgs.length; k < localMsgs.length; k++) {
        merged.push(localMsgs[k]!);
      }

      if (merged.length) setMessages(merged);
      else if (localMsgs.length) setMessages(localMsgs);
    })();

    return () => {
      cancelled = true;
    };
  }, [storageKey, user?.id, ensureSessionId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages, storageKey]);

  useEffect(() => {
    const el = intersectionAnchorRef?.current;
    if (!el) {
      setFabVisible(true);
      return;
    }
    setFabVisible(false);
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setFabVisible(true);
      },
      { root: null, threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [intersectionAnchorRef]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const canSend =
    input.trim().length > 0 &&
    !isSending &&
    Date.now() >= clientCooldownUntil &&
    (remaining === null || remaining > 0);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending || Date.now() < clientCooldownUntil) return;

    let threadForApi: ChatMsg[] = [];
    setMessages((prev) => {
      threadForApi = [...prev, { role: "user", content: text }];
      return threadForApi;
    });
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const sessionId = ensureSessionId();
      if (!sessionId) {
        setMessages((m) => m.slice(0, -1));
        setInput(text);
        setError("Could not start a chat session. Refresh and try again.");
        setIsSending(false);
        return;
      }

      const context = await buildContextSnapshot();

      const res = await fetch("/api/helpyji/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: threadForApi,
          surface,
          context,
          session_id: sessionId,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        remaining?: number;
        limit?: number;
        retryAfterSec?: number;
        groq_model?: string;
      };

      if (typeof data.limit === "number") setLimit(data.limit);
      if (typeof data.remaining === "number") setRemaining(data.remaining);

      if (res.status === 401) {
        setMessages((m) => m.slice(0, -1));
        setInput(text);
        setError("Sign in to use HelpyJi.");
        return;
      }

      if (res.status === 429 && data.retryAfterSec != null) {
        setMessages((m) => m.slice(0, -1));
        setInput(text);
        setError(data.error ?? "Please wait a moment.");
        setClientCooldownUntil(Date.now() + data.retryAfterSec * 1000);
        return;
      }

      const reply = data.message;
      if (!res.ok || !data.ok || typeof reply !== "string" || !reply) {
        setMessages((m) => m.slice(0, -1));
        setInput(text);
        setError(data.error ?? "Could not reach HelpyJi. Try again.");
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        return;
      }

      if (typeof data.groq_model === "string" && data.groq_model) {
        setLastGroqModel(data.groq_model);
        console.log(`[HelpyJi] Using model: ${data.groq_model}`);
      }
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (typeof data.remaining === "number") setRemaining(data.remaining);

      setClientCooldownUntil(Date.now() + 2000);
    } catch {
      setMessages((m) => m.slice(0, -1));
      setInput(text);
      setError("Network error. Check your connection.");
    } finally {
      setIsSending(false);
    }
  }, [
    buildContextSnapshot,
    clientCooldownUntil,
    ensureSessionId,
    input,
    isSending,
    surface,
    user,
  ]);

  if (!user) return null;

  if (!fabVisible) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 p-0 md:bottom-6 md:right-6">
      {open ? (
        <div
          className="kal-glass-panel pointer-events-auto flex max-h-[min(76vh,560px)] w-[min(100vw-1.5rem,400px)] flex-col overflow-hidden rounded-2xl border-kal-accent/25 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
        >
          <div className="relative shrink-0 border-b border-kal-border/80 bg-gradient-to-r from-kal-accent-soft/60 via-transparent to-kal-accent-soft/30 px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-kal-accent/20 text-kal-accent dark:bg-kal-accent/25">
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p id={labelId} className="text-sm font-bold tracking-tight text-kal-text">
                    HelpyJi
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-kal-text-secondary">
                    Your guide for plans &amp; fit—here to help you prep smarter, not to
                    pressure you.
                  </p>
                  <GroqModelDebugBadge
                    modelId={lastGroqModel}
                    visible={showModelDebug}
                    logPrefix="HelpyJi"
                  />
                  {limit != null && remaining != null ? (
                    <p className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-kal-accent">
                      {remaining} of {limit} free today
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-kal-text-secondary transition hover:bg-black/5 hover:text-kal-text dark:hover:bg-white/10"
                aria-label="Close HelpyJi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            className="min-h-[120px] flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.length === 0 ? (
              <p className="text-xs leading-relaxed text-kal-text-secondary">
                Tell me your exam and what&apos;s stuck—price, time, or whether Kalnehi
                fits how you actually study. I&apos;ll keep it real and short.
              </p>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "ml-auto border border-kal-accent/30 bg-kal-accent-soft/85 text-kal-text backdrop-blur-sm"
                    : "mr-auto border border-kal-border/60 bg-kal-card/92 text-kal-text backdrop-blur-sm"
                }`}
              >
                {m.content}
              </div>
            ))}
            {isSending ? (
              <p className="text-xs italic text-kal-text-secondary">HelpyJi is typing…</p>
            ) : null}
            {error ? (
              <p className="text-xs font-medium text-[var(--kal-danger-text)]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-kal-border/80 bg-kal-card/60 px-3 py-3 backdrop-blur-sm">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask anything about plans or your prep…"
                className="min-h-[44px] flex-1 rounded-xl border border-kal-border/90 bg-kal-input-bg px-3 text-sm text-kal-text shadow-inner placeholder:text-kal-muted focus:border-kal-accent focus:outline-none focus:ring-2 focus:ring-kal-accent/25"
                disabled={isSending || (remaining !== null && remaining <= 0)}
                maxLength={2000}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!canSend || (remaining !== null && remaining <= 0)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-kal-accent px-3 text-kal-accent-foreground shadow-md transition hover:brightness-105 disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>

          <footer className="shrink-0 border-t border-kal-border/70 bg-kal-card-muted/60 px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[0.65rem] leading-relaxed text-kal-text-secondary">
              {HELPYJI_DISCLAIMER_PRIMARY}{" "}
              <Link
                href="/terms"
                className="font-medium text-kal-accent underline decoration-kal-accent/40 underline-offset-2 hover:decoration-kal-accent"
              >
                {HELPYJI_TERMS_LINK_LABEL}
              </Link>
              .
            </p>
          </footer>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto inline-flex min-h-[52px] items-center gap-2 rounded-full border border-kal-accent/35 bg-gradient-to-br from-kal-accent-soft via-kal-card/95 to-kal-card/88 px-4 py-3 text-sm font-bold tracking-tight text-kal-text shadow-lg ring-1 ring-white/40 backdrop-blur-md transition hover:border-kal-accent/60 hover:shadow-xl"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <MessageCircle className="h-5 w-5 shrink-0 text-kal-accent" strokeWidth={2.25} />
        Talk to HelpyJi
      </button>
    </div>
  );
}
