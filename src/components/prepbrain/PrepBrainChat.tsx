"use client";

import { Brain, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { usePrepBrainAI } from "@/hooks/usePrepBrainAI";
import { PREPBRAIN_UI_DISCLAIMER } from "@/lib/prepBrainPrompts";
import {
  PREPBRAIN_USAGE_WARN_RATIO,
  type AiUsagePhase,
} from "@/lib/prepbrainTokens";

const SUGGESTED = [
  "I need about 20 more marks — what should I focus on first?",
  "Which chapters are my weakest right now, and how should I fix them?",
  "I'm not meditating regularly. What should I do this week?",
  "Based on my data, am I executing my daily plan well enough?",
];

function prepbrainUsagePeriodLabel(phase: AiUsagePhase): string {
  switch (phase) {
    case "welcome":
      return "1-day welcome trial";
    case "paid_trial":
      return "2-day paid trial";
    case "monthly":
      return "Monthly plan";
    default:
      return "";
  }
}

export function PrepBrainChat() {
  const {
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
  } = usePrepBrainAI();

  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;
  const usageNearLimit =
    usage != null &&
    !atTokenLimit &&
    usage.limit > 0 &&
    usage.used >= usage.limit * PREPBRAIN_USAGE_WARN_RATIO;
  const usagePeriodLabel =
    usage && usage.phase !== "none"
      ? prepbrainUsagePeriodLabel(usage.phase)
      : "";
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isSending || atTokenLimit) return;
    void sendMessage(draft);
    setDraft("");
  };

  return (
    <div
      className={[
        "kal-glass-panel flex flex-col overflow-hidden rounded-2xl",
        /* Mobile: bounded height so messages scroll inside; avoids tiny scroll with keyboard quirks */
        "h-[min(calc(100dvh-11.5rem),680px)]",
        "sm:h-auto sm:min-h-[min(70vh,560px)] sm:max-h-none",
      ].join(" ")}
    >
      <p className="shrink-0 border-b border-kal-border/50 bg-kal-accent-soft/35 px-3 py-2 text-center text-[11px] leading-snug text-kal-text sm:px-5 sm:text-xs">
        Add syllabus tracker information to the app for more personalised response
      </p>
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-kal-border/60 bg-kal-card/80 px-3 py-3 backdrop-blur-sm sm:items-center sm:gap-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kal-accent-soft text-kal-accent ring-1 ring-kal-accent/20 sm:h-11 sm:w-11">
            <Brain className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-kal-text sm:text-lg">PrepBrain AI</h2>
            {usage && !usageLoading && usage.phase !== "none" ? (
              <div className="mt-1.5 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px]">
                  <span className="min-w-0 font-medium tabular-nums text-kal-text">
                    <span className="text-kal-text-secondary">Used </span>
                    {usage.used.toLocaleString("en-IN")}
                    <span className="text-kal-text-secondary"> / </span>
                    {usage.limit.toLocaleString("en-IN")}
                    <span className="text-kal-text-secondary"> · Remaining </span>
                    {Math.max(0, usage.limit - usage.used).toLocaleString("en-IN")}
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {usagePeriodLabel ? (
                      <span className="text-[10px] text-kal-text-secondary">
                        {usagePeriodLabel}
                      </span>
                    ) : null}
                    {usageNearLimit ? (
                      <span className="text-[10px] font-semibold leading-none text-amber-800 dark:text-amber-200/90">
                        Near limit
                      </span>
                    ) : null}
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-kal-border/80"
                  role="progressbar"
                  aria-valuenow={Math.round(usagePct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`PrepBrain tokens: ${usage.used.toLocaleString("en-IN")} used of ${usage.limit.toLocaleString("en-IN")}`}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      atTokenLimit
                        ? "bg-[var(--kal-danger-text)]"
                        : usageNearLimit
                          ? "bg-amber-500"
                          : "bg-kal-accent"
                    }`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <p className="text-[9px] leading-snug text-kal-text-secondary sm:text-[10px]">
                  More complex queries use more tokens. Use carefully.
                </p>
                {tokenLimitMessage ? (
                  <p className="text-[10px] leading-snug text-[var(--kal-danger-text)]">
                    {tokenLimitMessage}
                  </p>
                ) : null}
              </div>
            ) : usageLoading ? (
              <p className="mt-1.5 text-[11px] text-kal-text-secondary">Loading usage…</p>
            ) : null}
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => clearChat()}
            className="touch-manipulation shrink-0 rounded-lg border border-kal-border/60 bg-kal-card/70 px-3 py-2 text-xs font-semibold leading-none text-kal-text-secondary backdrop-blur-sm transition-colors hover:border-kal-accent/30 hover:bg-kal-card hover:text-kal-text active:scale-[0.98] sm:min-h-0 sm:py-1.5"
          >
            Clear
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 [-webkit-overflow-scrolling:touch] sm:px-5 sm:py-4">
        {messages.length === 0 && !isSending && (
          <div className="mx-auto max-w-lg space-y-5 text-center sm:space-y-6">
            <p className="text-sm leading-relaxed text-kal-muted">
              Ask anything about your syllabus gaps, daily execution, habits, or calm
              focus. PrepBrain reads your Kalnehi data each time you send a message.
            </p>
            <div className="flex flex-col gap-2.5 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-kal-text-secondary">
                Try asking
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setError(null);
                      void sendMessage(q);
                    }}
                    disabled={isSending || atTokenLimit}
                    className="touch-manipulation rounded-xl border border-kal-border/50 bg-kal-card/75 px-3 py-3 text-left text-sm leading-snug text-kal-text backdrop-blur-sm transition-colors hover:border-kal-accent/35 hover:bg-kal-accent-soft/50 active:bg-kal-accent-soft/60 disabled:opacity-50 sm:min-h-0 sm:py-2.5"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 pb-1">
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
              className={
                m.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[min(100%,20rem)] rounded-2xl rounded-br-md border border-kal-accent/30 bg-kal-accent-soft/85 px-3.5 py-2.5 text-sm font-medium text-kal-text shadow-sm backdrop-blur-sm sm:max-w-[min(100%,28rem)]"
                    : "w-full max-w-full rounded-2xl rounded-bl-md border border-kal-border/50 bg-kal-card/90 px-3.5 py-2.5 text-sm leading-relaxed text-kal-text shadow-sm backdrop-blur-md sm:w-auto sm:max-w-[min(100%,34rem)]"
                }
              >
                <p className="break-words whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-kal-border/50 bg-kal-card/85 px-3.5 py-2.5 text-sm text-kal-text-secondary backdrop-blur-md">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                PrepBrain AI is going through your current prep status and forming a contextual response…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {error && (
        <div className="shrink-0 border-t border-kal-warn-border bg-kal-warn-soft px-3 py-2.5 text-center text-sm leading-snug text-kal-warn-text backdrop-blur-sm sm:px-4">
          {error}
          <button
            type="button"
            className="touch-manipulation ml-2 inline-flex min-h-[44px] items-center px-2 font-semibold underline sm:min-h-0"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-kal-border/60 bg-kal-card/70 p-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:p-4 sm:pb-4"
      >
        <div className="flex gap-2 sm:gap-2.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isSending && !atTokenLimit && draft.trim()) {
                  e.currentTarget.form?.requestSubmit();
                }
              }
            }}
            placeholder="Ask PrepBrain about your preparation…"
            rows={2}
            disabled={isSending || atTokenLimit}
            enterKeyHint="send"
            autoComplete="off"
            className="min-h-[44px] min-w-0 flex-1 resize-y rounded-xl border border-kal-border/60 bg-kal-input-bg px-3 py-2.5 text-base leading-normal text-kal-text placeholder:text-kal-text-secondary/70 backdrop-blur-sm focus:border-kal-accent/50 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 disabled:opacity-60 sm:min-h-[48px] sm:py-3 sm:text-sm"
          />
          <button
            type="submit"
            disabled={isSending || atTokenLimit || !draft.trim()}
            className="touch-manipulation inline-flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-xl bg-kal-accent text-kal-accent-foreground shadow-sm transition-opacity hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11"
            aria-label="Send"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-kal-text-secondary">
          PrepBrain intelligently pulls only the data it needs to answer you.
        </p>
        {/* Mobile: one-line control; full disclaimer inside expandable panel */}
        <details className="mt-0.5 sm:hidden">
          <summary className="flex cursor-pointer list-none items-center py-1.5 text-[10px] leading-snug text-kal-text-secondary underline decoration-kal-border decoration-dotted underline-offset-2 [&::-webkit-details-marker]:hidden">
            {"AI disclaimer · Terms"}
          </summary>
          <div className="mt-1.5 max-h-[min(28vh,200px)] overflow-y-auto rounded-md border border-kal-border/60 bg-kal-card-muted/40 px-2 py-1.5 text-[9px] leading-snug text-kal-text-secondary">
            <p>{PREPBRAIN_UI_DISCLAIMER}</p>
            <Link
              href="/terms"
              className="mt-1 inline-block font-medium text-kal-accent underline-offset-2 hover:underline"
            >
              Full Terms
            </Link>
          </div>
        </details>

        <div className="mt-1 hidden space-y-1 sm:block">
          <p className="text-[11px] leading-snug text-kal-text-secondary">
            Shift+Enter for a new line. PrepBrain uses your latest Kalnehi data each send.
          </p>
          <p className="text-[10px] leading-snug text-kal-text-secondary/90">
            {PREPBRAIN_UI_DISCLAIMER}{" "}
            <Link
              href="/terms"
              className="font-medium text-kal-accent underline-offset-2 hover:underline"
            >
              Terms
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
