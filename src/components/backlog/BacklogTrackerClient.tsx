"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, Square, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  appendPendingBacklogItems,
  commitBacklogSchedule,
  deletePendingBacklogRow,
  updatePendingBacklogRowSubject,
  type OrganizedBacklogItemInput,
} from "@/actions/backlogRecovery";
import {
  BACKLOG_TRACKER_PREFILL_KEY,
  BACKLOG_TIME_MAX_CAP,
  BACKLOG_TIME_MIN_CAP,
  BACKLOG_TIME_STEP_MINUTES,
  type BacklogTrackerPrefillV1,
} from "@/lib/backlogRecoveryConstants";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDoubtSyllabusSubjects } from "@/hooks/useDoubtSyllabusSubjects";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { useVoiceSttRouting } from "@/hooks/useVoiceSttRouting";
import {
  VOICE_LONG_FORM_MAX_SESSION_MS,
  VOICE_LONG_FORM_SILENCE_MS,
} from "@/lib/voiceConstants";
import { trackMetaBacklogAdded, trackMetaBacklogPlanLocked } from "@/lib/analytics";
import { useAuthStore } from "@/store/useAuthStore";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { AiFeatureGate } from "@/components/subscription/AiFeatureGate";
import { VoiceListeningHint } from "@/components/voice/VoiceListeningHint";
import { useCapacitorSpeech } from "@/hooks/useCapacitorSpeech";
import { useMediaRecorderVoice } from "@/hooks/useMediaRecorderVoice";

type OrganizeItem = {
  title: string;
  syllabus_master_id?: string | null;
  group_label?: string | null;
};

type Phase = "vent" | "time";

function clampMinutes(m: number): number {
  const s = Math.round(m / BACKLOG_TIME_STEP_MINUTES) * BACKLOG_TIME_STEP_MINUTES;
  return Math.max(BACKLOG_TIME_MIN_CAP, Math.min(BACKLOG_TIME_MAX_CAP, s));
}

const SUBJECT_MAX_LEN = 120;

function normalizeBacklogGroupLabel(label: string | null | undefined): string | null {
  const t = label?.trim().slice(0, SUBJECT_MAX_LEN) ?? "";
  return t.length > 0 ? t : null;
}

/** Prefer committed transcript; while listening, allow interim preview for organize API. */
function ventSourceForOrganize(
  transcript: string,
  voicePreview: string,
  voiceActive: boolean,
): string {
  const t = transcript.trim();
  const p = voicePreview.trim();
  if (t.length >= 4) return t;
  if (voiceActive && p.length >= 4) return p;
  return t;
}

export function BacklogTrackerClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const routing = useVoiceSttRouting();
  const {
    subjects: syllabusSubjectOptions,
    loading: syllabusSubjectsLoading,
  } = useDoubtSyllabusSubjects();

  const [transcript, setTranscript] = useState("");
  const [voicePreview, setVoicePreview] = useState("");
  const [items, setItems] = useState<OrganizeItem[]>([]);
  /** Parallel to `items`: user-set minutes, or from DB for existing rows */
  const [minutesList, setMinutesList] = useState<number[]>([]);
  const [itemMeta, setItemMeta] = useState<OrganizedBacklogItemInput[]>([]);
  const [timeIdx, setTimeIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("vent");

  /** yyyy-MM-dd; empty = automatic first day (today vs tomorrow from capacity rules) */
  const [scheduleStartYmd, setScheduleStartYmd] = useState("");
  const [liveError, setLiveError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"final" | "commit" | null>(null);
  /** After tapping Done on voice controls, wait for mic/STT idle then POST backlog-organize. */
  const [pendingOrganizeAfterVoiceDone, setPendingOrganizeAfterVoiceDone] = useState(false);

  const userLocalHour = useMemo(() => new Date().getHours(), []);

  const persistSubjectAtIndex = useCallback(async (idx: number, raw: string) => {
    const label = raw.trim().slice(0, SUBJECT_MAX_LEN) || null;
    const backlogId = itemMeta[idx]?.existing_backlog_id?.trim();
    setItems((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx], group_label: label };
      return next;
    });
    setItemMeta((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx], group_label: label };
      return next;
    });
    if (!backlogId) return;
    const res = await updatePendingBacklogRowSubject(backlogId, label);
    if (!res.ok) setLiveError(res.error);
  }, [itemMeta]);

  const removeCapturedItem = useCallback(async (idx: number) => {
    const backlogId = itemMeta[idx]?.existing_backlog_id?.trim();
    if (backlogId) {
      const res = await deletePendingBacklogRow(backlogId);
      if (!res.ok) {
        setLiveError(res.error);
        return;
      }
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setMinutesList((prev) => prev.filter((_, i) => i !== idx));
    setItemMeta((prev) => prev.filter((_, i) => i !== idx));
  }, [itemMeta]);

  /** LLM split of vent text — runs after voice Done when STT settles (`pendingOrganizeAfterVoiceDone`). */
  const runOrganize = useCallback(async (text: string) => {
    const t = text.trim();
    if (t.length < 4) return;
    setBusy("final");
    setLiveError(null);
    try {
      const res = await fetch("/api/backlog-organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transcript: t, mode: "final" }),
      });
      const data = (await res.json()) as
        | { ok: true; items: OrganizeItem[]; chips: string[] }
        | { ok: false; error: string };
      if (!data.ok) {
        setLiveError(data.error);
        return;
      }
      const batch = data.items ?? [];
      if (batch.length === 0) {
        setLiveError(
          "We couldn't pull separate tasks from that. Try shorter phrases, or add items one line at a time below.",
        );
        return;
      }
      // Structure with AI: keep rows client-only until final confirm (commit inserts backlog + daily tasks).
      setItems((prev) => [
        ...prev,
        ...batch.map((it) => ({
          title: it.title,
          syllabus_master_id: it.syllabus_master_id ?? null,
          group_label: normalizeBacklogGroupLabel(it.group_label),
        })),
      ]);
      setMinutesList((prev) => [...prev, ...batch.map(() => 60)]);
      setItemMeta((prev) => [
        ...prev,
        ...batch.map((it) => ({
          title: it.title,
          syllabus_master_id: it.syllabus_master_id,
          group_label: normalizeBacklogGroupLabel(it.group_label),
          details: "",
          effort_estimate_minutes: null,
        })),
      ]);
    } catch {
      setLiveError("Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(BACKLOG_TRACKER_PREFILL_KEY);
    if (!raw) return;
    sessionStorage.removeItem(BACKLOG_TRACKER_PREFILL_KEY);
    try {
      const p = JSON.parse(raw) as BacklogTrackerPrefillV1;
      if (p.v !== 1) return;

      if (Array.isArray(p.staged_items) && p.staged_items.length > 0) {
        const rows = p.staged_items.map((s) => ({
          title: String(s.title ?? "").trim().slice(0, 500),
          syllabus_master_id: s.syllabus_master_id ?? null,
          group_label: s.group_label ?? null,
        })).filter((r) => r.title.length > 0);
        if (rows.length === 0) return;
        setItems(rows);
        setMinutesList(rows.map(() => 60));
        setItemMeta(
          rows.map((r) => ({
            title: r.title,
            details: "",
            syllabus_master_id: r.syllabus_master_id,
            group_label: r.group_label,
            effort_estimate_minutes: null,
          })),
        );
        setTimeIdx(0);
        setPhase("time");
        return;
      }

      if (p.load_existing_rows && user?.id && Array.isArray(p.backlog_ids) && p.backlog_ids.length > 0) {
        const ids = p.backlog_ids;
        void (async () => {
          const supabase = getSupabaseBrowserClient();
          const { data, error } = await supabase
            .from("user_syllabus_backlog")
            .select(
              "id, title, details, group_label, syllabus_master_id, effort_estimate_minutes, retry_count, last_attempt_date",
            )
            .in("id", ids)
            .eq("status", "pending");
          if (error || !data?.length) {
            if (p.titles?.length) setTranscript(p.titles.join("\n"));
            return;
          }
          const rows = data.map((r) => ({
            title: r.title,
            syllabus_master_id: r.syllabus_master_id,
            group_label: r.group_label,
          }));
          setItems(rows);
          setMinutesList(
            data.map((r) =>
              clampMinutes(
                typeof r.effort_estimate_minutes === "number" &&
                  Number.isFinite(r.effort_estimate_minutes)
                  ? r.effort_estimate_minutes
                  : 60,
              ),
            ),
          );
          setItemMeta(
            data.map((r) => ({
              title: r.title,
              details: r.details ?? "",
              syllabus_master_id: r.syllabus_master_id,
              group_label: r.group_label,
              effort_estimate_minutes: r.effort_estimate_minutes,
              existing_backlog_id: r.id,
              retry_count: r.retry_count ?? 0,
              last_attempt_date: r.last_attempt_date ?? null,
            })),
          );
          setTimeIdx(0);
          setPhase("time");
        })();
        return;
      }

      if (p.titles?.length) {
        setTranscript(p.titles.join("\n"));
        return;
      }
      if (!user?.id || !Array.isArray(p.backlog_ids) || p.backlog_ids.length === 0) return;
      const backlogIdsForTitles = p.backlog_ids;
      void (async () => {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from("user_syllabus_backlog")
          .select("title")
          .in("id", backlogIdsForTitles);
        const titles = (data ?? []).map((r) => r.title).filter(Boolean);
        if (titles.length) setTranscript(titles.join("\n"));
      })();
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  const appendTranscript = useCallback((chunk: string) => {
    const c = chunk.trim();
    if (!c) return;
    setTranscript((prev) => (prev ? `${prev} ${c}` : c));
  }, []);

  const handleVoiceTranscript = useCallback(
    ({ transcript: tr }: { transcript: string; occurredAt: string; durationSeconds: number }) => {
      appendTranscript(tr);
      setVoicePreview("");
    },
    [appendTranscript],
  );

  const {
    isListening,
    isSupported: webSpeechSupported,
    startListening,
    stopListening,
    cancelListening,
    error: voiceError,
    clearError: clearVoiceError,
  } = useDeviceSpeechRecognition({
    lang: "en-IN",
    maxSessionMs: VOICE_LONG_FORM_MAX_SESSION_MS,
    silenceMs: VOICE_LONG_FORM_SILENCE_MS,
    interimPreview: true,
    onPreviewTranscript: setVoicePreview,
    onTranscript: handleVoiceTranscript,
    reportUsage: routing.useWebSpeechStt ? "onTranscript" : "none",
  });

  const {
    clearError: clearCapError,
    error: capError,
    isRecording: isCapRecording,
    isTranscribing: isCapTranscribing,
    startRecording: startCapRecording,
    stopRecording: stopCapRecording,
  } = useCapacitorSpeech({
    variant: "longForm",
    onTranscript: handleVoiceTranscript,
    onPartialTranscript: setVoicePreview,
    maxMs: VOICE_LONG_FORM_MAX_SESSION_MS,
  });

  const {
    clearError: clearWhisperError,
    error: whisperError,
    isRecording: isWhisperRecording,
    isTranscribing: isWhisperTranscribing,
    startRecording: startWhisperRecording,
    stopRecording: stopWhisperRecording,
    discardRecording: discardWhisperRecording,
    cancelPendingTranscription: cancelWhisperTranscription,
    isSupported: whisperMicSupported,
  } = useMediaRecorderVoice({
    maxMs: VOICE_LONG_FORM_MAX_SESSION_MS,
    onTranscript: handleVoiceTranscript,
  });

  const isSupported = routing.useNativeCapacitorStt
    ? true
    : routing.useBrowserWhisperStt
      ? whisperMicSupported
      : webSpeechSupported;

  const isVoiceActive =
    routing.useNativeCapacitorStt
      ? isCapRecording || isCapTranscribing
      : routing.useBrowserWhisperStt
        ? isWhisperRecording || isWhisperTranscribing
        : isListening;

  const voiceMicError = routing.useNativeCapacitorStt
    ? capError
    : routing.useBrowserWhisperStt
      ? whisperError
      : voiceError;

  const ventOrganizeText = useMemo(
    () => ventSourceForOrganize(transcript, voicePreview, isVoiceActive),
    [transcript, voicePreview, isVoiceActive],
  );

  useEffect(() => {
    if (!pendingOrganizeAfterVoiceDone || isVoiceActive || busy !== null) return;

    const merged = `${transcript.trim()} ${voicePreview.trim()}`.replace(/\s{2,}/g, " ").trim();
    const candidate =
      ventOrganizeText.trim().length >= 4 ? ventOrganizeText.trim() : merged;

    if (candidate.length >= 4) {
      setPendingOrganizeAfterVoiceDone(false);
      void runOrganize(candidate);
      return;
    }

    const id = window.setTimeout(() => {
      setPendingOrganizeAfterVoiceDone(false);
    }, 1600);
    return () => window.clearTimeout(id);
  }, [
    pendingOrganizeAfterVoiceDone,
    isVoiceActive,
    busy,
    transcript,
    voicePreview,
    ventOrganizeText,
    runOrganize,
  ]);

  const cancelVoiceCapture = useCallback(() => {
    setPendingOrganizeAfterVoiceDone(false);
    clearCapError();
    clearWhisperError();
    clearVoiceError();
    setVoicePreview("");
    if (routing.useNativeCapacitorStt) {
      void stopCapRecording();
    } else if (routing.useBrowserWhisperStt) {
      if (isWhisperRecording) {
        discardWhisperRecording();
      } else if (isWhisperTranscribing) {
        cancelWhisperTranscription();
      }
    } else {
      cancelListening();
    }
  }, [
    routing.useNativeCapacitorStt,
    routing.useBrowserWhisperStt,
    clearCapError,
    clearVoiceError,
    clearWhisperError,
    discardWhisperRecording,
    cancelWhisperTranscription,
    cancelListening,
    isWhisperRecording,
    isWhisperTranscribing,
    stopCapRecording,
  ]);

  const finishVoiceCapture = useCallback(() => {
    if (routing.useNativeCapacitorStt) {
      if (isCapRecording) stopCapRecording();
      return;
    }
    if (routing.useBrowserWhisperStt) {
      if (isWhisperRecording) stopWhisperRecording();
      return;
    }
    if (isListening) stopListening();
  }, [
    routing.useNativeCapacitorStt,
    routing.useBrowserWhisperStt,
    isCapRecording,
    isWhisperRecording,
    isListening,
    stopCapRecording,
    stopWhisperRecording,
    stopListening,
  ]);

  const onVoiceDonePressed = useCallback(() => {
    setPendingOrganizeAfterVoiceDone(true);
    finishVoiceCapture();
  }, [finishVoiceCapture]);

  const startVoiceCapture = useCallback(() => {
    setPendingOrganizeAfterVoiceDone(false);
    if (routing.useNativeCapacitorStt) {
      clearCapError();
      setVoicePreview("");
      void startCapRecording();
      return;
    }
    if (routing.useBrowserWhisperStt) {
      clearWhisperError();
      setVoicePreview("");
      void startWhisperRecording();
      return;
    }
    clearVoiceError();
    setVoicePreview("");
    void startListening();
  }, [
    routing.useNativeCapacitorStt,
    routing.useBrowserWhisperStt,
    clearCapError,
    clearWhisperError,
    clearVoiceError,
    startCapRecording,
    startWhisperRecording,
    startListening,
  ]);

  const flushDirectLines = async () => {
    const lines = transcript
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (lines.length === 0) return;
    const organizeItems: OrganizeItem[] = lines.map((title) => ({
      title: title.slice(0, 500),
      syllabus_master_id: null,
      group_label: null,
    }));
    const inputs: OrganizedBacklogItemInput[] = organizeItems.map((it) => ({
      title: it.title,
      syllabus_master_id: it.syllabus_master_id,
      group_label: it.group_label,
      details: "",
      effort_estimate_minutes: null,
    }));
    setLiveError(null);
    const persist = await appendPendingBacklogItems(inputs);
    if (!persist.ok) {
      setLiveError(persist.error);
      return;
    }
    setItems((prev) => [...prev, ...organizeItems]);
    setMinutesList((prev) => [...prev, ...organizeItems.map(() => 60)]);
    setItemMeta((prev) => [
      ...prev,
      ...organizeItems.map((it, i) => ({
        title: it.title,
        syllabus_master_id: it.syllabus_master_id,
        group_label: it.group_label,
        details: "",
        effort_estimate_minutes: null,
        existing_backlog_id: persist.ids[i],
      })),
    ]);
    setTranscript("");
    trackMetaBacklogAdded();
  };

  const continueToSetTimes = () => {
    if (items.length === 0) return;
    setScheduleStartYmd("");
    setTimeIdx(0);
    setPhase("time");
  };

  const itemsWithMinutesForServer = useCallback((): OrganizedBacklogItemInput[] => {
    return items.map((it, i) => {
      const base = itemMeta[i] ?? {
        title: it.title,
        details: "",
        syllabus_master_id: it.syllabus_master_id,
        group_label: it.group_label,
      };
      return {
        ...base,
        title: it.title,
        syllabus_master_id: it.syllabus_master_id,
        group_label: it.group_label,
        effort_estimate_minutes: minutesList[i] ?? 60,
      };
    });
  }, [items, itemMeta, minutesList]);

  const onCommit = async () => {
    const payload = itemsWithMinutesForServer();
    setBusy("commit");
    setLiveError(null);
    try {
      const res = await commitBacklogSchedule(payload, today, userLocalHour, "heavier", {
        ventRawText: transcript.trim() || null,
        scheduleStartYmd: scheduleStartYmd.trim() || null,
      });
      if (!res.ok) {
        setLiveError(res.error);
        return;
      }
      trackMetaBacklogPlanLocked();
      router.refresh();
      setTranscript("");
      setItems([]);
      setMinutesList([]);
      setItemMeta([]);
      setScheduleStartYmd("");
      setPhase("vent");
      setTimeIdx(0);
    } finally {
      setBusy(null);
    }
  };

  const onTimeNext = () => {
    if (timeIdx < items.length - 1) {
      setTimeIdx((k) => k + 1);
      return;
    }
    const payload = itemsWithMinutesForServer();
    if (payload.some((p) => (p.effort_estimate_minutes ?? 0) < BACKLOG_TIME_MIN_CAP)) {
      setLiveError("Give each task at least 15 minutes.");
      return;
    }
    void onCommit();
  };

  const onTimeBack = () => {
    if (timeIdx > 0) setTimeIdx((k) => k - 1);
    else setPhase("vent");
  };

  const setMinuteAt = (idx: number, delta: number) => {
    setMinutesList((prev) => {
      const next = [...prev];
      const cur = next[idx] ?? 60;
      next[idx] = clampMinutes(cur + delta);
      return next;
    });
  };

  const curMinutes = minutesList[timeIdx] ?? 60;
  const curItem = items[timeIdx];

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-20">
      <header className="space-y-1">
        <p className="kal-category-label text-kal-accent">Backlog Tracker</p>
        <h1 className="kal-feature-title">Catch up on backlog</h1>
        <p className="text-sm text-kal-muted">
          Put everything you&apos;re behind on in one place (or paste one task per line). Build a checklist, set
          minutes for each item on the same screen as your start date, then confirm. Tasks aren&apos;t
          added to your daily plan until you confirm at the end.
        </p>
      </header>

      <datalist id="backlog-tracker-subject-suggestions">
        {syllabusSubjectOptions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {phase === "vent" ? (
        <div className="space-y-6">
          <section className="space-y-3 rounded-2xl border border-kal-border bg-kal-card p-4 kal-shadow-card">
            <label className="block text-xs font-semibold text-kal-muted">
              Tell your Backlogs
            </label>
            <textarea
              value={isVoiceActive && voicePreview ? voicePreview : transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={5}
              className="w-full resize-y rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent focus:outline-none focus:ring-2 focus:ring-kal-accent/25"
              placeholder="Type your backlog here or just speak it up"
            />

            <div className="flex flex-wrap items-center gap-2">
              <AiFeatureGate>
                {!isVoiceActive ? (
                  <button
                    type="button"
                    onClick={() => startVoiceCapture()}
                    disabled={!isSupported || isWhisperTranscribing || busy !== null}
                    className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-accent px-4 py-2 text-sm font-semibold text-kal-accent-foreground disabled:opacity-50"
                  >
                    <Mic className="h-4 w-4" aria-hidden />
                    Speak
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onVoiceDonePressed()}
                      disabled={
                        !isSupported ||
                        isWhisperTranscribing ||
                        !(isListening || isWhisperRecording || isCapRecording)
                      }
                      className="inline-flex max-w-full items-center gap-2 rounded-xl border border-kal-border bg-kal-accent px-3 py-2 text-sm font-semibold leading-snug text-kal-accent-foreground disabled:opacity-50"
                    >
                      <Square className="h-4 w-4 shrink-0" aria-hidden />
                      Structure with AI
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelVoiceCapture()}
                      disabled={
                        !isSupported ||
                        !(isListening ||
                          isWhisperRecording ||
                          isCapRecording ||
                          isWhisperTranscribing ||
                          isCapTranscribing)
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2 text-sm font-semibold text-kal-text disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" aria-hidden />
                      Cancel
                    </button>
                  </>
                )}
              </AiFeatureGate>
              <button
                type="button"
                onClick={() => void flushDirectLines()}
                disabled={
                  busy !== null ||
                  isVoiceActive ||
                  !transcript
                    .split(/\n/)
                    .map((l) => l.trim())
                    .some(Boolean)
                }
                className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2 text-sm font-semibold text-kal-text disabled:opacity-50"
              >
                Direct Add
              </button>
            </div>
            {isSupported ? (
              <div className="space-y-2 text-[11px] leading-snug text-kal-muted">
                <p>
                  Put whatever you&apos;re catching up on in this box—you can dictate or type. New tasks land under{" "}
                  <strong className="text-kal-text">Captured</strong> below; tidy subjects there, then set time per
                  item and start date—confirm when you&apos;re ready.
                </p>
                <p>
                  <strong className="text-kal-text">Speak</strong> starts listening. When you&apos;re finished, tap{" "}
                  <strong className="text-kal-text">Structure with AI</strong>—it stops the mic, keeps your words in
                  this box, and turns them into separate tasks under{" "}
                  <strong className="text-kal-text">Captured</strong> after they&apos;ve finished transferring.
                </p>
                <p>
                  <strong className="text-kal-text">Cancel</strong> discards the current recording and does not create
                  tasks. Typed one task per line? Tap <strong className="text-kal-text">Direct Add</strong>—each line is
                  saved exactly as you typed, then appears under{" "}
                  <strong className="text-kal-text">Captured</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-[11px] leading-snug text-kal-muted">
                <p>
                  Add backlog items in the box: type one task per line, tap{" "}
                  <strong className="text-kal-text">Direct Add</strong>, and set subjects under{" "}
                  <strong className="text-kal-text">Captured</strong>. Voice isn&apos;t supported on this browser.
                </p>
              </div>
            )}
            {isVoiceActive ? (
              <>
                <p className="animate-pulse text-[11px] font-medium text-kal-muted">
                  {isWhisperTranscribing
                    ? "Transcribing…"
                    : routing.useBrowserWhisperStt && isWhisperRecording
                      ? "Recording…"
                      : "Listening…"}
                </p>
                {!isWhisperTranscribing ? (
                  <VoiceListeningHint
                    visible
                    className="!text-left"
                    variant={routing.useBrowserWhisperStt ? "whisper" : "dictation"}
                    stopLabel="Structure with AI"
                  />
                ) : null}
              </>
            ) : null}
            {voiceMicError ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">{voiceMicError}</p>
            ) : null}
            {busy === "final" ? (
              <p className="text-[11px] text-kal-muted" aria-live="polite">
                Organizing your tasks…
              </p>
            ) : null}
          </section>

          {items.length > 0 ? (
            <section className="space-y-3 rounded-2xl border border-kal-border/90 bg-kal-card-muted/30 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-kal-text">
                    Captured ({items.length})
                  </p>
                  <span className="text-[11px] text-kal-muted">From notes, voice, or lines</span>
                </div>
                <p className="text-[11px] leading-snug text-kal-muted">
                  Set subject for each item below. Suggestions match your syllabus (same as Doubt Tracker).
                  {syllabusSubjectsLoading ? (
                    <span className="block pt-0.5">Loading syllabus subjects…</span>
                  ) : syllabusSubjectOptions.length === 0 ? (
                    <span className="block pt-0.5">
                      No syllabus list yet—check{" "}
                      <Link href="/profile" className="font-semibold text-kal-accent underline">
                        Profile
                      </Link>{" "}
                      for your exam, or type a subject by hand.
                    </span>
                  ) : null}
                </p>
              </div>
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {items.map((it, i) => (
                  <li
                    key={`${it.title}-${i}`}
                    className="flex items-start justify-between gap-2 rounded-lg border border-kal-border/60 bg-kal-card px-2.5 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium leading-snug">{it.title}</p>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-kal-muted">
                        Subject
                      </label>
                      <input
                        type="text"
                        list="backlog-tracker-subject-suggestions"
                        value={it.group_label ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.slice(0, SUBJECT_MAX_LEN);
                          const gl = v.length > 0 ? v : null;
                          setItems((prev) => {
                            const next = [...prev];
                            if (next[i]) next[i] = { ...next[i], group_label: gl };
                            return next;
                          });
                          setItemMeta((prev) => {
                            const next = [...prev];
                            if (next[i])
                              next[i] = { ...next[i], group_label: gl };
                            return next;
                          });
                        }}
                        onBlur={(e) => void persistSubjectAtIndex(i, e.target.value)}
                        placeholder="Pick from syllabus or type"
                        aria-label={`Subject for ${it.title}`}
                        className="w-full rounded-lg border border-kal-border/70 bg-kal-card-muted px-2 py-1 text-[11px] text-kal-muted placeholder:text-kal-muted/70 focus:border-kal-accent focus:text-kal-text focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeCapturedItem(i)}
                      className="shrink-0 text-[11px] font-semibold text-kal-muted hover:text-rose-600 dark:hover:text-rose-300"
                      aria-label={`Remove ${it.title}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={continueToSetTimes}
                className="w-full rounded-xl bg-kal-accent py-3 text-sm font-bold text-kal-accent-foreground"
              >
                Set time for each · {items.length} item{items.length === 1 ? "" : "s"}
              </button>
            </section>
          ) : null}

        </div>
      ) : null}

      {phase === "time" && curItem ? (
        <section className="space-y-4 rounded-2xl border border-kal-border bg-kal-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-kal-muted">
              {timeIdx + 1} of {items.length}
            </p>
            <p className="text-[11px] text-kal-muted">
              Roughly how long will this block need?
            </p>
          </div>
          <div>
            <p className="text-base font-semibold text-kal-text">{curItem.title}</p>
            <label
              htmlFor="backlog-time-subject"
              className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-kal-muted"
            >
              Subject
            </label>
            <input
              id="backlog-time-subject"
              type="text"
              list="backlog-tracker-subject-suggestions"
              value={curItem.group_label ?? ""}
              onChange={(e) => {
                const v = e.target.value.slice(0, SUBJECT_MAX_LEN);
                const gl = v.length > 0 ? v : null;
                const i = timeIdx;
                setItems((prev) => {
                  const next = [...prev];
                  if (next[i]) next[i] = { ...next[i], group_label: gl };
                  return next;
                });
                setItemMeta((prev) => {
                  const next = [...prev];
                  if (next[i]) next[i] = { ...next[i], group_label: gl };
                  return next;
                });
              }}
              onBlur={(e) => void persistSubjectAtIndex(timeIdx, e.target.value)}
              placeholder="Pick from syllabus or type"
              className="mt-1 w-full rounded-lg border border-kal-border bg-kal-card-muted px-2 py-1.5 text-xs text-kal-text placeholder:text-kal-muted focus:border-kal-accent focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              className="rounded-xl border border-kal-border px-4 py-2 text-lg font-bold"
              onClick={() => setMinuteAt(timeIdx, -BACKLOG_TIME_STEP_MINUTES)}
              aria-label="Decrease minutes"
            >
              −
            </button>
            <span className="min-w-[5rem] text-center text-xl font-bold tabular-nums">
              {curMinutes} min
            </span>
            <button
              type="button"
              className="rounded-xl border border-kal-border px-4 py-2 text-lg font-bold"
              onClick={() => setMinuteAt(timeIdx, BACKLOG_TIME_STEP_MINUTES)}
              aria-label="Increase minutes"
            >
              +
            </button>
          </div>

          <div className="space-y-2 rounded-xl border border-kal-border/70 bg-kal-card-muted/40 px-3 py-3">
            <label htmlFor="backlog-start-date" className="block text-xs font-semibold text-kal-muted">
              When do you want to fix it?
            </label>
            <input
              id="backlog-start-date"
              type="date"
              min={today}
              value={scheduleStartYmd}
              onChange={(e) => setScheduleStartYmd(e.target.value)}
              disabled={busy !== null}
              className="w-full rounded-lg border border-kal-border bg-kal-card px-2 py-1.5 text-sm text-kal-text disabled:opacity-50"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onTimeBack}
              className="flex-1 rounded-xl border border-kal-border bg-kal-card-muted py-2 text-sm font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onTimeNext}
              disabled={busy !== null}
              className="flex-1 rounded-xl bg-kal-accent py-2 text-sm font-bold text-kal-accent-foreground disabled:opacity-50"
            >
              {busy === "commit"
                ? "Saving…"
                : timeIdx < items.length - 1
                  ? "Next"
                  : "Confirm and add to plan"}
            </button>
          </div>
        </section>
      ) : null}

      {liveError ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          {liveError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/backlog-list" className="font-semibold text-kal-accent hover:underline">
          Backlog List
        </Link>
        <Link
          href="/daily-plan"
          className="font-semibold text-kal-muted hover:text-kal-accent hover:underline"
        >
          Daily Plan
        </Link>
      </div>
    </div>
  );
}
