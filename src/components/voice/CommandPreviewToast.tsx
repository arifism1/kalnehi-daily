"use client";

import clsx from "clsx";
import { useEffect, useRef, type CSSProperties } from "react";

import type { VoiceCommandIntent } from "@/lib/voiceCommandGroq";

const PREVIEW_MS = 2500;

function summaryLine(intent: VoiceCommandIntent): string {
  switch (intent.intent) {
    case "focus_mode":
      return `Starting ${intent.duration}m ${intent.mode} focus${intent.linked_task ? ` · ${intent.linked_task}` : ""}`;
    case "plan_management":
      return `${intent.action_type.replace("_", " ")} “${intent.task_name}”${
        intent.time_start || intent.time_end
          ? ` (${[intent.time_start, intent.time_end].filter(Boolean).join("–")})`
          : ""
      }`;
    case "doubt_logging":
      return `Log doubt · ${intent.subject}`;
    case "mindset_trigger":
      return `Open ${intent.trigger_type.replace("_", " ")}`;
    case "navigate":
      return `Go to ${intent.path}`;
    case "add_task":
      return `Add “${intent.subject}” to today${
        intent.time_start || intent.time_end
          ? ` (${[intent.time_start, intent.time_end].filter(Boolean).join("–")})`
          : ""
      }`;
    case "mark_completed":
      return `Mark “${intent.subject}” done`;
    case "ask_prepbrain":
      return "Open Mastermind";
    case "schedule_revision":
      return intent.exact_date
        ? `Schedule revision · ${intent.subject} · ${intent.exact_date}`
        : `Schedule revision · ${intent.subject} · in ${intent.days} day(s)`;
    case "mark_syllabus_progress":
      return `Syllabus · ${intent.subject}`;
    case "log_sleep":
      return `Log ${intent.hours}h sleep`;
    case "query_plan":
      return "Open daily plan";
    case "query_progress":
      return "Open progress";
    case "batch_add_tasks":
      return `Add ${intent.items.length} task(s) · ${intent.plan_date}`;
    default:
      return "Run voice command";
  }
}

type Props = {
  intent: VoiceCommandIntent;
  responseText: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * 2.5s cancel window before executing a parsed intent. On unmount / phase change,
 * the auto-confirm timeout is cleared so no rogue `onConfirm` runs.
 */
export function CommandPreviewToast({
  intent,
  responseText,
  onConfirm,
  onCancel,
}: Props) {
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
    onCancelRef.current = onCancel;
  }, [onConfirm, onCancel]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onConfirmRef.current();
    }, PREVIEW_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [intent]);

  const line = summaryLine(intent);

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-kal-text-secondary">
          Interpreting
        </p>
        <p className="mt-1 text-sm font-semibold text-kal-text leading-snug">
          {line}
        </p>
        <p className="mt-1.5 text-xs text-kal-text-secondary leading-snug line-clamp-3">
          {responseText}
        </p>
      </div>

      <div className="space-y-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-kal-border">
          <div
            className="kal-voice-preview-progress h-full rounded-full bg-kal-accent"
            style={
              { animationDuration: `${PREVIEW_MS}ms` } satisfies CSSProperties
            }
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onCancelRef.current()}
            className={clsx(
              "flex-1 rounded-xl border border-kal-border bg-kal-card-muted py-2.5 text-sm font-semibold",
              "text-kal-text transition-colors hover:bg-kal-border/30 active:scale-[0.98]",
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmRef.current()}
            className={clsx(
              "flex-1 rounded-xl border border-kal-accent/35 bg-kal-accent py-2.5 text-sm font-semibold text-white",
              "shadow-sm transition-colors hover:opacity-95 active:scale-[0.98]",
            )}
          >
            Run now
          </button>
        </div>
      </div>
    </div>
  );
}
