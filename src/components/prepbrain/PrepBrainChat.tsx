"use client";

import { format } from "date-fns";
import {
  Brain,
  CheckCircle2,
  Loader2,
  Menu,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { usePrepBrainAI } from "@/hooks/usePrepBrainAI";
import { trackActivity } from "@/lib/activity";
import { useAllExamScopes } from "@/hooks/useAllExamScopes";
import { PREPBRAIN_UI_DISCLAIMER } from "@/lib/prepBrainPrompts";
import {
  PREPBRAIN_USAGE_WARN_RATIO,
  type AiUsagePhase,
} from "@/lib/prepbrainTokens";
import { AiTokenLimitLinks } from "@/components/subscription/LimitExceededLinks";
import { PrepBrainIllustration } from "@/components/illustrations/PrepBrainIllustration";


function RobotSendIcon({ sending }: { sending: boolean }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-8" aria-hidden>
      {/* Antenna stem */}
      <line x1="22" y1="5" x2="22" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round" />
      {/* Antenna tip — heart shape */}
      <path d="M22 3 C22 3 19 1 19 3.5 C19 5 22 7 22 7 C22 7 25 5 25 3.5 C25 1 22 3 22 3Z" fill="white">
        <animateTransform attributeName="transform" type="scale" values="1,1;1.25,1.25;1,1" dur="1.6s" additive="sum" repeatCount="indefinite" begin="0s" />
      </path>

      {/* Head — very round */}
      <rect x="7" y="11" width="30" height="26" rx="10" fill="white" opacity="0.95" />

      {/* Ear nubs */}
      <rect x="4" y="18" width="5" height="9" rx="2.5" fill="white" opacity="0.75" />
      <rect x="35" y="18" width="5" height="9" rx="2.5" fill="white" opacity="0.75" />

      {/* Blush cheeks */}
      <ellipse cx="12.5" cy="29" rx="3.5" ry="2" fill="#FFB366" opacity="0.55" />
      <ellipse cx="31.5" cy="29" rx="3.5" ry="2" fill="#FFB366" opacity="0.55" />

      {/* Eyes */}
      {sending ? (
        /* Spinning swirl eyes while sending */
        <>
          <circle cx="16" cy="22" r="4" fill="#FF7A00" opacity="0.15" />
          <path d="M16 19 A3 3 0 0 1 19 22" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" fill="none">
            <animateTransform attributeName="transform" type="rotate" from="0 16 22" to="360 16 22" dur="0.7s" repeatCount="indefinite" />
          </path>
          <circle cx="28" cy="22" r="4" fill="#FF7A00" opacity="0.15" />
          <path d="M28 19 A3 3 0 0 1 31 22" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" fill="none">
            <animateTransform attributeName="transform" type="rotate" from="0 28 22" to="360 28 22" dur="0.7s" repeatCount="indefinite" />
          </path>
        </>
      ) : (
        /* Big sparkly blinking eyes */
        <>
          <circle cx="16" cy="22" r="4.5" fill="#FF7A00" />
          <circle cx="17.5" cy="20.5" r="1.5" fill="white" opacity="0.85" />
          <circle cx="14.5" cy="24" r="0.8" fill="white" opacity="0.5" />
          <ellipse cx="16" cy="22" rx="4.5" ry="4.5" fill="none">
            <animate attributeName="ry" values="4.5;0.3;4.5" dur="3.2s" begin="1s" repeatCount="indefinite" />
          </ellipse>

          <circle cx="28" cy="22" r="4.5" fill="#FF7A00" />
          <circle cx="29.5" cy="20.5" r="1.5" fill="white" opacity="0.85" />
          <circle cx="26.5" cy="24" r="0.8" fill="white" opacity="0.5" />
          <ellipse cx="28" cy="22" rx="4.5" ry="4.5" fill="none">
            <animate attributeName="ry" values="4.5;0.3;4.5" dur="3.2s" begin="1s" repeatCount="indefinite" />
          </ellipse>

          {/* Blink overlay — white rectangles that grow/shrink */}
          <rect x="11.5" y="17.5" width="9" height="9" rx="4.5" fill="white" opacity="0">
            <animate attributeName="opacity" values="0;0;1;0;0" dur="3.2s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="height" values="0;0;9;0;0" dur="3.2s" begin="1s" repeatCount="indefinite" />
          </rect>
          <rect x="23.5" y="17.5" width="9" height="9" rx="4.5" fill="white" opacity="0">
            <animate attributeName="opacity" values="0;0;1;0;0" dur="3.2s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="height" values="0;0;9;0;0" dur="3.2s" begin="1s" repeatCount="indefinite" />
          </rect>
        </>
      )}

      {/* Mouth */}
      {sending ? (
        <path d="M15 32 Q22 28 29 32" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" fill="none">
          <animate attributeName="d" values="M15 32 Q22 28 29 32;M15 30 Q22 34 29 30;M15 32 Q22 28 29 32" dur="0.9s" repeatCount="indefinite" />
        </path>
      ) : (
        /* Big UwU smile */
        <path d="M14 31 Q22 37 30 31" stroke="#FF7A00" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

function prepbrainUsagePeriodLabel(phase: AiUsagePhase): string {
  switch (phase) {
    case "welcome":
      return "7-day free trial";
    case "paid_trial":
      return "Smart Plan (trial)";
    case "monthly":
      return "Monthly plan";
    default:
      return "";
  }
}

const prepbrainAssistantMarkdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2.5 last:mb-0 break-words">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-kal-text">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 [ul]:my-1 [ul]:list-[circle]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 [ol]:my-1">{children}</ol>
  ),
  li: ({ children }) => <li className="break-words">{children}</li>,
  h1: ({ children }) => (
    <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 text-[15px] font-semibold first:mt-0">{children}</h3>
  ),
  a: ({ href, children, node, ...props }) => {
    void node;
    const external = href?.startsWith("http");
    return (
      <a
        href={href}
        {...props}
        className="font-medium text-kal-accent underline-offset-2 hover:underline"
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  },
  code: ({ className, children, node, ...props }) => {
    void node;
    const inline = !className;
    if (inline) {
      return (
        <code
          {...props}
          className="rounded bg-kal-border/35 px-1 py-0.5 font-mono text-[0.88em]"
        >
          {children}
        </code>
      );
    }
    return (
      <code {...props} className={className}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-kal-border/60 bg-kal-card-muted/50 p-3 text-[13px] leading-relaxed [scrollbar-width:thin] sm:text-sm">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-kal-accent/40 pl-3 text-kal-text-secondary italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-kal-border/60" />,
  table: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <div className="my-3 max-w-full overflow-x-auto rounded-lg [scrollbar-width:thin]">
        <table
          {...rest}
          className="w-full min-w-[min(100%,280px)] border-collapse border border-kal-border/50 text-left text-[13px] sm:text-sm"
        />
      </div>
    );
  },
  thead: (props) => {
    const { node, className, ...rest } = props;
    void node;
    return (
      <thead {...rest} className={clsx("bg-kal-accent-soft/45", className)} />
    );
  },
  th: (props) => {
    const { node, className, ...rest } = props;
    void node;
    return (
      <th
        {...rest}
        className={clsx(
          "border border-kal-border/50 px-2 py-1.5 font-semibold text-kal-text",
          className,
        )}
      />
    );
  },
  td: (props) => {
    const { node, className, ...rest } = props;
    void node;
    return (
      <td
        {...rest}
        className={clsx(
          "border border-kal-border/50 px-2 py-1.5 align-top text-kal-text",
          className,
        )}
      />
    );
  },
  tr: (props) => {
    const { node, ...rest } = props;
    void node;
    return <tr {...rest} />;
  },
  tbody: (props) => {
    const { node, ...rest } = props;
    void node;
    return <tbody {...rest} />;
  },
  del: ({ children }) => (
    <del className="text-kal-text-secondary line-through">{children}</del>
  ),
};

function PrepBrainAssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="min-w-0 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={prepbrainAssistantMarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function PrepBrainChat() {
  const {
    messages,
    isSending,
    error,
    setError,
    sendMessage,
    newChat,
    conversationId,
    conversations,
    conversationsLoading,
    historyLoading,
    openConversation,
    deleteConversation,
    usage,
    usageLoading,
    atTokenLimit,
    tokenLimitMessage,
  } = usePrepBrainAI();

  const { examScopes, isMultiExam } = useAllExamScopes();

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
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    if (!historyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen]);

  const handleOpenConversation = async (id: string) => {
    setHistoryOpen(false);
    await openConversation(id);
  };

  const handleNewChatFromMenu = () => {
    setError(null);
    newChat();
    setHistoryOpen(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isSending || atTokenLimit) return;
    trackActivity("ai_chat_sent", { feature: "prepbrain" });
    void sendMessage(draft);
    setDraft("");
  };

  return (
    <div
      className={[
        "kal-glass-panel flex flex-col overflow-hidden rounded-3xl",
        historyOpen && "max-sm:touch-none",
        "h-[min(calc(100dvh-var(--kal-safe-top,0px)-var(--kal-safe-bottom,0px)-9rem),760px)]",
        "sm:h-[min(calc(100dvh-var(--kal-safe-top,0px)-var(--kal-safe-bottom,0px)-10rem),800px)] sm:min-h-[min(76vh,640px)]",
      ].join(" ")}
    >
      {/* Minimal header — calm hierarchy; usage lives in sidebar */}
      <header className="flex shrink-0 items-start gap-2.5 border-b border-kal-border/40 bg-gradient-to-b from-white/50 to-transparent px-3 py-2.5 backdrop-blur-md sm:gap-4 sm:px-6 sm:py-4">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="touch-manipulation mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/50 bg-white/55 text-kal-text shadow-sm ring-1 ring-black/[0.04] transition-colors hover:bg-white/80 hover:ring-kal-accent/20 active:scale-[0.98] dark:border-white/10 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/70 sm:h-11 sm:w-11 sm:rounded-2xl"
          aria-expanded={historyOpen}
          aria-controls="prepbrain-history-drawer"
          aria-label="Open menu, usage, and chat history"
        >
          <Menu className="size-5" strokeWidth={2} aria-hidden />
        </button>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-kal-accent-soft text-kal-accent shadow-sm ring-1 ring-kal-accent/15 sm:h-9 sm:w-9 sm:rounded-xl">
              <Brain className="size-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} aria-hidden />
            </span>
            <h2 className="kal-section-heading">
              Mastermind
            </h2>
          </div>
        </div>
      </header>

      {atTokenLimit && tokenLimitMessage ? (
        <div className="shrink-0 border-b border-kal-warn-border bg-kal-warn-soft px-4 py-2.5 text-center text-xs leading-snug text-[var(--kal-danger-text)] sm:px-6">
          <p>{tokenLimitMessage}</p>
          {usage ? <AiTokenLimitLinks phase={usage.phase} /> : null}
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {historyOpen ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-20 bg-black/45 backdrop-blur-[2px] transition-opacity"
              aria-label="Close chat history"
              onClick={() => setHistoryOpen(false)}
            />
            <div
              id="prepbrain-history-drawer"
              className="absolute inset-y-0 left-0 z-30 flex max-h-full w-[min(100%,20rem)] max-w-[90vw] flex-col border-r border-white/50 bg-[rgba(255,252,248,0.94)] shadow-[8px_0_40px_rgba(60,40,20,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/92 sm:w-80"
              role="dialog"
              aria-modal="true"
              aria-label="Mastermind menu"
            >
              <div className="shrink-0 px-4 pt-3">
                <div className="kal-glass-card rounded-2xl p-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-kal-text-secondary">
                      Mastermind usage
                    </p>
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(false)}
                      className="touch-manipulation -mr-1 -mt-1 flex size-11 items-center justify-center rounded-lg text-kal-text-secondary transition-colors hover:bg-white/60 hover:text-kal-text dark:hover:bg-white/10"
                      aria-label="Close menu"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                  {usageLoading ? (
                    <p className="mt-2 text-xs text-kal-text-secondary">Loading…</p>
                  ) : usage && usage.limit > 0 ? (
                    <>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="tabular-nums text-sm font-semibold text-kal-text">
                          {usage.used.toLocaleString("en-IN")}
                          <span className="font-normal text-kal-text-secondary">
                            {" "}
                            / {usage.limit.toLocaleString("en-IN")}
                          </span>
                          <span className="ml-1 text-xs font-normal text-kal-text-secondary">
                            tokens
                          </span>
                        </span>
                        {usagePeriodLabel ? (
                          <span className="rounded-full border border-kal-border/50 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-kal-text-secondary shadow-sm dark:bg-zinc-900/80">
                            {usagePeriodLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-kal-text-secondary">
                        <span className="font-medium text-kal-text">Remaining</span>{" "}
                        {Math.max(0, usage.limit - usage.used).toLocaleString("en-IN")}
                      </p>
                      <div
                        className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-kal-border/50"
                        role="progressbar"
                        aria-valuenow={Math.round(usagePct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Mastermind tokens used: ${usage.used} of ${usage.limit}`}
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
                      {usageNearLimit && !atTokenLimit ? (
                        <p className="mt-2 text-[10px] font-medium text-amber-800 dark:text-amber-200/90">
                          Running low — shorter questions use fewer tokens.
                        </p>
                      ) : null}
                      {tokenLimitMessage ? (
                        <div className="mt-2 text-[10px] leading-snug text-[var(--kal-danger-text)]">
                          <p>{tokenLimitMessage}</p>
                          {usage ? (
                            <div className="mt-1.5 text-kal-text [&_a]:text-kal-accent">
                              <AiTokenLimitLinks phase={usage.phase} />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-kal-text-secondary">
                      Usage unavailable right now.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNewChatFromMenu}
                disabled={isSending}
                className="kal-glass-subtle mx-4 mt-4 flex touch-manipulation items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold text-kal-text shadow-sm transition-colors hover:ring-1 hover:ring-kal-accent/25 disabled:opacity-50"
              >
                <SquarePen className="size-4 shrink-0 text-kal-accent" aria-hidden />
                New chat
              </button>
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 [-webkit-overflow-scrolling:touch]">
                <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-kal-text-secondary">
                  Recents
                </p>
                {conversationsLoading ? (
                  <p className="py-2 text-[11px] text-kal-text-secondary">Loading chats…</p>
                ) : conversations.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-kal-border/50 bg-kal-card-muted/30 px-2.5 py-3 text-[11px] leading-snug text-kal-text-secondary">
                    No saved chats yet. Send a message to start a thread — it will show up here.
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {conversations.map((c) => (
                      <li key={c.id} className="group flex items-stretch gap-0.5">
                        <button
                          type="button"
                          onClick={() => void handleOpenConversation(c.id)}
                          disabled={isSending || historyLoading}
                          className={clsx(
                            "min-w-0 flex-1 touch-manipulation rounded-xl px-2.5 py-2 text-left transition-colors disabled:opacity-50",
                            conversationId === c.id
                              ? "bg-kal-accent-soft ring-1 ring-kal-accent/25"
                              : "hover:bg-kal-card-muted/70",
                          )}
                        >
                          <span className="line-clamp-2 text-[13px] font-medium leading-snug text-kal-text">
                            {c.title?.trim() || "Mastermind chat"}
                          </span>
                          <span className="mt-1 block text-[10px] text-kal-text-secondary">
                            {format(new Date(c.updated_at), "d MMM yyyy, h:mm a")}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label="Delete this chat"
                          onClick={(e) => {
                            e.preventDefault();
                            void deleteConversation(c.id);
                          }}
                          disabled={isSending}
                          className="touch-manipulation flex size-11 shrink-0 items-center justify-center self-center rounded-lg text-kal-text-secondary opacity-70 transition-colors hover:bg-kal-card-muted hover:text-[var(--kal-danger-text)] disabled:opacity-40"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : null}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {historyLoading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-kal-card/60 backdrop-blur-[1px]">
              <Loader2 className="size-8 animate-spin text-kal-accent" aria-hidden />
              <span className="sr-only">Loading chat</span>
            </div>
          ) : null}
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch] sm:px-8 sm:py-8">
        {messages.length === 0 && !isSending && (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center sm:gap-8">
            <PrepBrainIllustration className="w-full max-w-[90px] sm:max-w-[110px]" />
            {/* Instruction box */}
            <div className="kal-glass-card w-full rounded-2xl p-4 text-left sm:p-5">
              {/* For / Not For columns */}
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {/* What it's for */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-kal-text-secondary/70 sm:text-[11px]">
                    Use Mastermind for
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "Boosting your marks — where to focus first",
                      "Identifying weak areas and what to prioritize",
                      "Revision strategy & spaced repetition planning",
                      "Mental preparation, focus & handling exam pressure",
                      "Analyzing your progress and giving clear next steps",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2
                          className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-hidden
                        />
                        <span className="text-[12px] leading-snug text-kal-text-secondary sm:text-[13px]">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What it's NOT for */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-kal-text-secondary/70 sm:text-[11px]">
                    Not for
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "Solving questions or giving answers to academic problems",
                      "Explaining concepts or teaching topics",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <X
                          className="mt-0.5 size-3.5 shrink-0 text-red-500/80"
                          aria-hidden
                        />
                        <span className="text-[12px] leading-snug text-kal-text-secondary sm:text-[13px]">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        )}

        <div className="space-y-3 pb-1">
          {messages.map((m, i) => (
            <div key={i}>
              <div
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
                      : "w-full max-w-full rounded-2xl rounded-bl-md border border-kal-border/50 bg-kal-card/90 px-3.5 py-3 text-[15px] leading-[1.55] text-kal-text shadow-sm backdrop-blur-md sm:w-auto sm:max-w-[min(100%,36rem)] sm:px-4 sm:py-3.5 sm:text-base"
                  }
                >
                  {m.role === "user" ? (
                    <p className="break-words whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <PrepBrainAssistantMarkdown content={m.content} />
                  )}
                </div>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="flex flex-col gap-1 rounded-2xl rounded-bl-md border border-kal-border/50 bg-kal-card/85 px-3.5 py-3 backdrop-blur-md">
                <div className="flex items-center gap-2 text-[15px] leading-snug text-kal-text-secondary sm:text-base">
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  Mastermind is preparing a reply from your latest prep data…
                </div>
                <p className="pl-6 text-[12px] leading-snug text-kal-text-secondary/60">
                  We take some time to process your real data and give relevant answers — please be patient.
                </p>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
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
        className="shrink-0 border-t border-kal-border/35 bg-gradient-to-t from-white/60 to-white/30 p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl dark:from-zinc-950/80 dark:to-zinc-950/40 sm:p-5"
      >
        <div className="mx-auto flex max-w-3xl w-full flex-row items-end gap-2 sm:gap-3">
          <div className="kal-glass-card relative min-h-0 flex-1 rounded-2xl p-0.5 shadow-[0_8px_28px_rgba(80,50,20,0.06)] ring-1 ring-inset ring-white/60 dark:ring-white/10">
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
              placeholder="Message Mastermind…"
              rows={1}
              disabled={isSending || atTokenLimit}
              enterKeyHint="send"
              autoComplete="off"
              className="max-h-[min(32vh,160px)] min-h-[48px] w-full resize-y overflow-y-auto rounded-[0.875rem] border-0 bg-transparent px-3.5 py-3 text-base leading-snug text-kal-text placeholder:text-kal-text-secondary/50 focus:outline-none focus:ring-0 disabled:opacity-60 sm:min-h-[52px] sm:px-4 sm:py-3.5"
            />
          </div>
          <button
            type="submit"
            disabled={isSending || atTokenLimit || !draft.trim()}
            className="touch-manipulation inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-kal-accent text-kal-accent-foreground shadow-[0_6px_20px_rgba(255,122,0,0.32)] transition-transform hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:h-[52px] sm:w-[52px] sm:rounded-2xl"
            aria-label="Send"
          >
            <RobotSendIcon sending={isSending} />
          </button>
        </div>
        {/* Mobile: one-line control; full disclaimer inside expandable panel */}
        <details className="mx-auto mt-2 max-w-3xl sm:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-center py-0.5 text-[10px] leading-snug text-kal-text-secondary/80 underline decoration-kal-border/60 decoration-dotted underline-offset-2 [&::-webkit-details-marker]:hidden">
            AI disclaimer · Terms
          </summary>
          <div className="mt-2 max-h-[min(28vh,200px)] overflow-y-auto rounded-xl border border-kal-border/50 bg-kal-card-muted/30 px-3 py-2 text-[10px] leading-snug text-kal-text-secondary">
            <p>{PREPBRAIN_UI_DISCLAIMER}</p>
            <Link
              href="/terms"
              className="mt-1 inline-block font-medium text-kal-accent underline-offset-2 hover:underline"
            >
              Full Terms
            </Link>
          </div>
        </details>

        <div className="mx-auto mt-2 hidden max-w-3xl text-center sm:block">
          <p className="text-[11px] leading-relaxed text-kal-text-secondary/85">
            Shift+Enter for a new line.{" "}
            <span className="text-kal-text-secondary/70">{PREPBRAIN_UI_DISCLAIMER}</span>{" "}
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
    </div>
  );
}
