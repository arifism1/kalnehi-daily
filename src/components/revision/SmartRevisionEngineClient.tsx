"use client";

import { addSelectedSyllabusRowsToDailyPlan } from "@/lib/quickTaskCreate";
import { appendRevisionLog, overrideNextReviewDate } from "@/actions/revision";
import { ensureAutomatedNotifications } from "@/actions/notifications";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { buildDangerZoneTopics } from "@/lib/revision/dangerZone";
import {
  aggregateRevisionHeatmap,
  computeRevisionStreak,
  type LogRow,
} from "@/lib/revision/heatmap";
import type { RevisionTopicStateLite } from "@/lib/revision/smartSuggestions";
import {
  buildPlannedRevisionSections,
  type PlannedItem,
} from "@/lib/revision/plannedSchedule";
import { suggestedNextReviewDate } from "@/lib/revision/spacing";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import { isFeatureBlocked } from "@/lib/subscriptionTiers";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";
import { SyllabusComingSoon } from "@/components/syllabus/SyllabusComingSoon";
import { EngineCard, EngineHero } from "@/components/engine/EngineHero";
import { subDays, format, parseISO, addDays, startOfDay } from "date-fns";
import { Bell, Calendar, Flame, Loader2, Mic, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import type { Json } from "@/types/supabase";

type TopicStateRow = {
  syllabus_master_id: string;
  topic_title: string;
  next_review_effective_date: string | null;
  last_recalled_at: string | null;
  last_confidence_stars: number | null;
};

function rowLabel(r: MergedSyllabusRow): string {
  return (r.microtopic ?? "").trim() || (r.chapter ?? "").trim() || "Topic";
}

const TOPIC_MATCH_CAP = 40;
const TOPIC_LISTBOX_ID = "active-recall-topic-listbox";
const SCHEDULE_TOPIC_LISTBOX_ID = "schedule-revision-topic-listbox";
/** Min length for a free-typed topic when not linked to syllabus. */
const CUSTOM_TOPIC_MIN_LEN = 2;

function formatTopicDisplay(r: MergedSyllabusRow): string {
  return `${rowLabel(r)} · ${(r.subject ?? "").trim() || "Subject"}`;
}

export function SmartRevisionEngineClient() {
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const { examLabel, loading: examLoading } = usePrimaryExamLabel();
  const {
    rows,
    cuetAwaitingDomainSelection,
    loading: syllabusLoading,
    error: syllabusError,
  } = useSyllabusTracker();
  const { tier, hasPaidAccess, freeTrialActive, freeTrialVoiceSecondsRemaining } =
    useSubscriptionAccess();

  const syllabusSoon = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading: examLoading,
    syllabusLoading,
    syllabusError,
    syllabusRowCount: rows.length,
    cuetAwaitingDomainSelection,
  });

  const [topicStates, setTopicStates] = useState<TopicStateRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [recallText, setRecallText] = useState("");
  const [groqLoading, setGroqLoading] = useState(false);
  const [groqFeedback, setGroqFeedback] = useState<{
    text: string;
    model: string;
    quality?: number;
  } | null>(null);
  const [stars, setStars] = useState<number>(3);
  const [overrideDate, setOverrideDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [lastVoiceSeconds, setLastVoiceSeconds] = useState(0);
  const [usedVoice, setUsedVoice] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const topicSearchWrapRef = useRef<HTMLDivElement | null>(null);
  const [plannedNotice, setPlannedNotice] = useState<string | null>(null);
  const [plannedBusyId, setPlannedBusyId] = useState<string | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = useState<Record<string, string>>(
    {},
  );
  const [scheduleQuery, setScheduleQuery] = useState("");
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [scheduleRowId, setScheduleRowId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(() =>
    format(addDays(startOfDay(new Date()), 1), "yyyy-MM-dd"),
  );
  const topicInputRef = useRef<HTMLInputElement | null>(null);
  const scheduleSearchWrapRef = useRef<HTMLDivElement | null>(null);

  const voiceUnlocked = useMemo(() => {
    if (isFeatureBlocked(tier, "ai_voice")) return false;
    if (hasPaidAccess) return true;
    if (freeTrialActive && freeTrialVoiceSecondsRemaining > 0) return true;
    return false;
  }, [
    tier,
    hasPaidAccess,
    freeTrialActive,
    freeTrialVoiceSecondsRemaining,
  ]);

  const rowById = useMemo(() => {
    const m = new Map<string, MergedSyllabusRow>();
    for (const r of rows) {
      m.set(normalizeSyllabusMasterId(String(r.id)), r);
    }
    return m;
  }, [rows]);

  const filteredTopicRows = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    if (!q) return [];
    const out: MergedSyllabusRow[] = [];
    for (const r of rows) {
      const hay = `${rowLabel(r)} ${(r.chapter ?? "").trim()} ${(r.subject ?? "").trim()}`
        .toLowerCase();
      if (hay.includes(q)) {
        out.push(r);
        if (out.length >= TOPIC_MATCH_CAP) break;
      }
    }
    return out;
  }, [rows, topicQuery]);

  const filteredScheduleRows = useMemo(() => {
    const q = scheduleQuery.trim().toLowerCase();
    if (!q) return rows.slice(0, TOPIC_MATCH_CAP);
    const out: MergedSyllabusRow[] = [];
    for (const r of rows) {
      const hay = `${rowLabel(r)} ${(r.chapter ?? "").trim()} ${(r.subject ?? "").trim()}`
        .toLowerCase();
      if (hay.includes(q)) {
        out.push(r);
        if (out.length >= TOPIC_MATCH_CAP) break;
      }
    }
    return out;
  }, [rows, scheduleQuery]);

  useEffect(() => {
    if (!activeTopicId) return;
    const r = rowById.get(activeTopicId);
    if (r) setTopicQuery(formatTopicDisplay(r));
  }, [activeTopicId, rowById]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!topicSearchWrapRef.current?.contains(e.target as Node)) {
        setTopicPickerOpen(false);
      }
      if (!scheduleSearchWrapRef.current?.contains(e.target as Node)) {
        setSchedulePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, []);

  const pickTopic = useCallback(
    (r: MergedSyllabusRow) => {
      const id = normalizeSyllabusMasterId(String(r.id));
      setActiveTopicId(id);
      setTopicQuery(formatTopicDisplay(r));
      setTopicPickerOpen(false);
      setSessionNotice(null);
    },
    [],
  );

  const clearActiveTopic = useCallback(() => {
    setActiveTopicId(null);
    setTopicQuery("");
    setTopicPickerOpen(false);
  }, []);

  const pickScheduleRow = useCallback((r: MergedSyllabusRow) => {
    setScheduleRowId(normalizeSyllabusMasterId(String(r.id)));
    setScheduleQuery(formatTopicDisplay(r));
    setSchedulePickerOpen(false);
    setPlannedNotice(null);
  }, []);

  const clearScheduleForm = useCallback(() => {
    setScheduleRowId(null);
    setScheduleQuery("");
    setSchedulePickerOpen(false);
  }, []);

  /**
   * Syllabus-linked row (picker) or free-text label (not in tracker).
   */
  const activeRecallContext = useMemo(():
    | { type: "syllabus"; row: MergedSyllabusRow; id: string }
    | { type: "custom"; title: string }
    | null => {
    if (activeTopicId) {
      const row = rowById.get(activeTopicId);
      if (row) {
        return {
          type: "syllabus",
          row,
          id: normalizeSyllabusMasterId(String(row.id)),
        };
      }
    }
    const raw = topicQuery.trim();
    if (raw.length >= CUSTOM_TOPIC_MIN_LEN) {
      return { type: "custom", title: raw.slice(0, 500) };
    }
    return null;
  }, [activeTopicId, rowById, topicQuery]);

  const topicStateById = useMemo((): Record<string, RevisionTopicStateLite> => {
    const o: Record<string, RevisionTopicStateLite> = {};
    for (const t of topicStates) {
      const id = normalizeSyllabusMasterId(t.syllabus_master_id);
      o[id] = {
        next_review_effective_date: t.next_review_effective_date,
        last_recalled_at: t.last_recalled_at,
      };
    }
    return o;
  }, [topicStates]);

  const danger = useMemo(
    () => buildDangerZoneTopics(rows, topicStateById, today, 8),
    [rows, topicStateById, today],
  );

  const last84Start = useMemo(
    () => startOfDay(subDays(parseISO(today), 83)),
    [today],
  );
  const heatmapCounts = useMemo(
    () => aggregateRevisionHeatmap(logs, last84Start, startOfDay(parseISO(today))),
    [logs, last84Start, today],
  );

  const streak = useMemo(() => computeRevisionStreak(logs, today), [logs, today]);

  const refreshData = useCallback(async () => {
    if (!userId) {
      setTopicStates([]);
      setLogs([]);
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    const supabase = getSupabaseBrowserClient();
    const fromIso = subDays(new Date(), 120).toISOString();

    const [stRes, logRes] = await Promise.all([
      supabase
        .from("user_revision_topic_state")
        .select(
          "syllabus_master_id, topic_title, next_review_effective_date, last_recalled_at, last_confidence_stars",
        )
        .eq("user_id", userId),
      supabase
        .from("user_revision_logs")
        .select("created_at, session_kind")
        .eq("user_id", userId)
        .gte("created_at", fromIso),
    ]);

    if (stRes.data) {
      setTopicStates(stRes.data as TopicStateRow[]);
    }
    if (logRes.data) {
      setLogs(logRes.data as LogRow[]);
    }
    setDataLoading(false);
  }, [userId]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!userId) return;
    void ensureAutomatedNotifications().catch(() => {
      /* non-fatal; bell page also runs this */
    });
  }, [userId]);

  const plannedSections = useMemo(
    () => buildPlannedRevisionSections(topicStates, rowById, today),
    [topicStates, rowById, today],
  );

  const runOverridePlannedDate = useCallback(
    async (it: PlannedItem, effectiveDate: string) => {
      setPlannedBusyId(it.syllabusId);
      setPlannedNotice(null);
      try {
        const r = await overrideNextReviewDate({
          syllabusMasterId: it.syllabusId,
          topicTitle: it.topicTitle,
          effectiveDate,
        });
        if (!r.ok) {
          setPlannedNotice(r.error);
          return;
        }
        await refreshData();
      } finally {
        setPlannedBusyId(null);
      }
    },
    [refreshData],
  );

  const onMovePlannedReviewToToday = useCallback(
    (it: PlannedItem) => {
      if (it.nextDate === today) return;
      void runOverridePlannedDate(it, today);
    },
    [runOverridePlannedDate, today],
  );

  const onApplyPlannedReschedule = useCallback(
    (it: PlannedItem) => {
      const raw = (rescheduleDraft[it.syllabusId] ?? it.nextDate).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        setPlannedNotice("Choose a valid date for reschedule.");
        return;
      }
      void runOverridePlannedDate(it, raw);
    },
    [rescheduleDraft, runOverridePlannedDate],
  );

  const onAddPlannedToDailyPlan = useCallback(
    async (it: PlannedItem) => {
      if (!userId || !it.row) return;
      setPlannedBusyId(it.syllabusId);
      setPlannedNotice(null);
      try {
        const r = await addSelectedSyllabusRowsToDailyPlan(userId, today, [it.row]);
        if (!r.ok) {
          setPlannedNotice(r.error);
          return;
        }
        setPlannedNotice(
          r.created > 0
            ? "Added to your daily plan for today."
            : "That topic is already on today’s plan.",
        );
      } finally {
        setPlannedBusyId(null);
      }
    },
    [userId, today],
  );

  const onSubmitScheduleNewRevision = useCallback(async () => {
    if (!userId) return;
    if (!scheduleRowId) {
      setPlannedNotice("Search and select a syllabus topic, then pick a date.");
      return;
    }
    const row = rowById.get(scheduleRowId);
    if (!row) {
      setPlannedNotice("That topic is no longer available. Pick another.");
      return;
    }
    const d = scheduleDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setPlannedNotice("Choose a valid date.");
      return;
    }
    setPlannedBusyId("__schedule_new__");
    setPlannedNotice(null);
    try {
      const r = await overrideNextReviewDate({
        syllabusMasterId: scheduleRowId,
        topicTitle: rowLabel(row),
        effectiveDate: d,
      });
      if (!r.ok) {
        setPlannedNotice(r.error);
        return;
      }
      clearScheduleForm();
      setScheduleDate(format(addDays(parseISO(today), 1), "yyyy-MM-dd"));
      await refreshData();
    } finally {
      setPlannedBusyId(null);
    }
  }, [
    userId,
    scheduleRowId,
    rowById,
    scheduleDate,
    today,
    refreshData,
    clearScheduleForm,
  ]);

  const onGetAiFeedback = async () => {
    const ctx = activeRecallContext;
    if (!ctx || !recallText.trim()) {
      setSessionNotice(
        "Set a topic (pick from list or type your own), then add your recall and request feedback.",
      );
      return;
    }
    setSessionNotice(null);
    setGroqLoading(true);
    setGroqFeedback(null);
    try {
      const payload =
        ctx.type === "syllabus"
          ? {
              topicTitle: rowLabel(ctx.row),
              subject: ctx.row.subject,
              chapter: ctx.row.chapter,
              transcript: recallText,
              mode: "typed" as const,
            }
          : {
              topicTitle: ctx.title,
              subject: null,
              chapter: null,
              transcript: recallText,
              mode: "typed" as const,
            };
      const res = await fetch("/api/revision-evaluate-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | {
            ok: true;
            feedback: string;
            quality_score: number;
            groq_model: string;
            groq_feedback: Json;
          }
        | { ok: false; error: string };
      if (data && typeof data === "object" && "ok" in data && data.ok) {
        setGroqFeedback({
          text: data.feedback,
          model: data.groq_model,
          quality: data.quality_score,
        });
      } else {
        setSessionNotice(
          "ok" in data && !data.ok && "error" in data
            ? String(data.error)
            : "Could not get feedback.",
        );
      }
    } finally {
      setGroqLoading(false);
    }
  };

  const { startListening, stopListening, isSupported, isListening } =
    useDeviceSpeechRecognition({
    lang: "en-IN",
    onTranscript: (payload) => {
      setRecallText((p) =>
        (p ? `${p} ${payload.transcript}` : payload.transcript).trim(),
      );
      setLastVoiceSeconds(payload.durationSeconds);
      setUsedVoice(true);
    },
  });

  const onStartVoice = () => {
    if (!voiceUnlocked) return;
    if (!activeRecallContext) {
      setSessionNotice(
        "Choose a topic or type your own (not in the list is fine), then use voice.",
      );
      return;
    }
    setLastVoiceSeconds(0);
    void startListening();
  };

  const onSaveSession = async () => {
    const ctx = activeRecallContext;
    if (!ctx) {
      setSessionNotice(
        `Pick a topic from the list or type your own (at least ${CUSTOM_TOPIC_MIN_LEN} characters).`,
      );
      return;
    }
    if (stars < 1 || stars > 5) {
      setSessionNotice("Rate your confidence (1 to 5 stars).");
      return;
    }
    const sLabel = ctx.type === "syllabus" ? rowLabel(ctx.row) : ctx.title;
    const syllabusIdForLog =
      ctx.type === "syllabus" ? ctx.id : null;
    const { suggested } = suggestedNextReviewDate(today, stars);
    const effective = overrideDate ?? suggested;
    setSaving(true);
    setSessionNotice(null);
    const groqPayload: Json | null = groqFeedback
      ? ({
          model: groqFeedback.model,
          text: groqFeedback.text,
          quality_hint: groqFeedback.quality,
        } as unknown as Json)
      : null;
    const res = await appendRevisionLog({
      syllabusMasterId: syllabusIdForLog,
      topicTitle: sLabel,
      sessionKind: usedVoice
        ? "active_recall_voice"
        : recallText.trim()
          ? "active_recall_typed"
          : "confidence_only",
      recallTranscript: recallText.trim() || null,
      groqModel: groqFeedback?.model ?? null,
      groqFeedback: groqPayload,
      confidenceStars: stars,
      suggestedNextReviewDate: suggested,
      nextReviewEffectiveDate: effective,
      userOverrodeNextReview: Boolean(overrideDate),
    });
    setSaving(false);
    if (res.ok) {
      setSessionNotice("Saved. Great work showing up for your future self.");
      setRecallText("");
      setGroqFeedback(null);
      setOverrideDate(null);
      setUsedVoice(false);
      void refreshData();
    } else {
      setSessionNotice(res.error);
    }
  };

  const onEvaluateVoice = async () => {
    if (!voiceUnlocked) return;
    const ctx = activeRecallContext;
    if (!ctx || !recallText.trim()) {
      setSessionNotice("Record your voice recall first, then we will evaluate.");
      return;
    }
    setGroqLoading(true);
    setGroqFeedback(null);
    try {
      const base =
        ctx.type === "syllabus"
          ? {
              topicTitle: rowLabel(ctx.row),
              subject: ctx.row.subject,
              chapter: ctx.row.chapter,
            }
          : { topicTitle: ctx.title, subject: null, chapter: null };
      const res = await fetch("/api/revision-evaluate-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...base,
          transcript: recallText,
          mode: "voice",
          durationSeconds: Math.min(
            300,
            lastVoiceSeconds > 0 ? lastVoiceSeconds : 60,
          ),
        }),
      });
      const data = (await res.json()) as
        | { ok: true; feedback: string; quality_score: number; groq_model: string }
        | { ok: false; error: string };
      if (data && "ok" in data && data.ok) {
        setUsedVoice(true);
        setGroqFeedback({
          text: data.feedback,
          model: data.groq_model,
          quality: data.quality_score,
        });
        if (typeof data.quality_score === "number") {
          setStars(Math.min(5, Math.max(1, Math.round(data.quality_score))));
        }
      } else {
        setSessionNotice(
          "ok" in data && !data.ok && "error" in data
            ? String((data as { error: string }).error)
            : "Voice evaluation failed.",
        );
      }
    } finally {
      setGroqLoading(false);
    }
  };

  const heatmapGrid = useMemo(() => {
    const cells: { date: string; count: number }[] = [];
    for (let i = 0; i < 84; i++) {
      const d = addDays(last84Start, i);
      const k = format(d, "yyyy-MM-dd");
      cells.push({ date: k, count: heatmapCounts[k] ?? 0 });
    }
    return cells;
  }, [last84Start, heatmapCounts]);

  const nextSuggestedForStars = useMemo(() => {
    if (!activeRecallContext) return null;
    return suggestedNextReviewDate(today, stars);
  }, [activeRecallContext, today, stars]);

  if (!userId) {
    return (
      <div className="space-y-6">
        <EngineHero
          eyebrow="Tutor-style revision"
          title="Smart Revision Engine"
          description="We suggest what matters most — you keep full control. Sign in to sync your revision memory across devices."
        />
        <EngineCard title="Sign in">
          <p className="text-sm text-kal-muted">Sign in to use the revision engine.</p>
        </EngineCard>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <EngineHero
        eyebrow="Spaced memory"
        title="Smart Revision Engine"
        description="Optional active recall, a calendar you control, and dates you can always override. Built for real study rhythms — not guilt."
      />

      {syllabusSoon && examLabel ? (
        <SyllabusComingSoon variant="compact" examLabel={examLabel} />
      ) : null}

      <section className="kal-glass-panel rounded-[1.25rem] p-5 sm:p-7">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kal-accent">
          Why this matters
        </h2>
        <ul className="mt-4 list-inside list-disc space-y-2.5 text-sm leading-relaxed text-kal-text-secondary">
          <li>
            <strong className="font-medium text-kal-text">Memory that survives exam week</strong> — spaced touch-ups beat last-minute rereads.
          </li>
          <li>
            <strong className="font-medium text-kal-text">Lower anxiety</strong> when you have proof you revisited the scary chapters.
          </li>
          <li>
            <strong className="font-medium text-kal-text">Long-haul retention</strong> for syllabi that do not fit in a single “revision day.”
          </li>
          <li>
            <strong className="font-medium text-kal-text">You own the plan</strong> — the calendar and recall tools are in your control.
          </li>
        </ul>
      </section>

      <section
        id="planned-revision"
        aria-labelledby="planned-revision-heading"
        className="kal-glass-panel rounded-[1.25rem] p-5 sm:p-7"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h2
            id="planned-revision-heading"
            className="text-xs font-semibold uppercase tracking-widest text-kal-accent"
          >
            Planned revision
          </h2>
          <Link
            href="/notifications"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-kal-accent hover:underline"
          >
            <Bell className="h-3.5 w-3.5" aria-hidden />
            Alerts
          </Link>
        </div>
        <p className="mt-2 text-sm text-kal-text-secondary">
          Your next review dates from saved sessions, grouped by day. When a date is due,
          a reminder is added to{" "}
          <Link href="/notifications" className="font-medium text-kal-accent underline">
            in-app Alerts
          </Link>{" "}
          (once per day) so you do not have to remember alone. Move a review to today, add it
          to your{" "}
          <Link href="/daily-plan" className="font-medium text-kal-accent underline">
            daily plan
          </Link>
          , or pick any new date.
        </p>

        {rows.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-kal-text">Plan a revision for later</h3>
            <p className="mt-1 text-xs text-kal-muted">
              Search your syllabus, choose a date, and we will place it on this calendar. You
              can change the date anytime below.
            </p>
            <div
              ref={scheduleSearchWrapRef}
              className="relative mt-3 min-w-0 text-xs text-kal-muted"
            >
              <label htmlFor="schedule-revision-topic" className="block">
                Topic
              </label>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                <input
                  id="schedule-revision-topic"
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={schedulePickerOpen}
                  aria-controls={SCHEDULE_TOPIC_LISTBOX_ID}
                  autoComplete="off"
                  value={scheduleQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setScheduleQuery(v);
                    if (scheduleRowId) {
                      const r = rowById.get(scheduleRowId);
                      if (r && v !== formatTopicDisplay(r)) {
                        setScheduleRowId(null);
                      }
                    }
                    setSchedulePickerOpen(v.trim().length > 0);
                  }}
                  onFocus={() => {
                    if (scheduleQuery.trim().length > 0) {
                      setSchedulePickerOpen(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setSchedulePickerOpen(false);
                    }
                  }}
                  placeholder="Type to search topics…"
                  className="w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-muted outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/30"
                />
                {scheduleRowId || scheduleQuery.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={clearScheduleForm}
                    className="text-xs font-medium text-kal-accent underline"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {schedulePickerOpen && scheduleQuery.trim().length > 0 ? (
                <ul
                  id={SCHEDULE_TOPIC_LISTBOX_ID}
                  role="listbox"
                  className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-kal-border/80 bg-kal-card/95 p-1 shadow-lg backdrop-blur dark:border-white/10 dark:bg-kal-page/95"
                  aria-label="Matching syllabus topics"
                >
                  {filteredScheduleRows.length === 0 ? (
                    <li className="px-3 py-2.5 text-sm text-kal-muted" role="presentation">
                      No matches. Try different words.
                    </li>
                  ) : (
                    filteredScheduleRows.map((r) => {
                      const id = normalizeSyllabusMasterId(String(r.id));
                      return (
                        <li key={id} role="presentation" className="min-w-0">
                          <button
                            type="button"
                            role="option"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickScheduleRow(r)}
                            className="flex w-full min-h-[2.5rem] flex-col items-stretch gap-0.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-kal-accent/10"
                          >
                            <span className="font-medium text-kal-text">{rowLabel(r)}</span>
                            <span className="text-xs text-kal-muted">
                              {(r.chapter ?? "").trim() && `${r.chapter} · `}
                              {r.subject}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              ) : null}
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 text-xs text-kal-muted">
                Review on
                <input
                  type="date"
                  className="mt-1.5 w-full max-w-xs rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={() => void onSubmitScheduleNewRevision()}
                disabled={plannedBusyId === "__schedule_new__" || !scheduleRowId}
                className="kal-btn-accent min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
              >
                {plannedBusyId === "__schedule_new__" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </span>
                ) : (
                  "Set review date"
                )}
              </button>
            </div>
          </div>
        ) : null}

        {plannedNotice ? (
          <p className="mt-4 text-sm text-kal-text-secondary">{plannedNotice}</p>
        ) : null}

        {dataLoading ? (
          <div className="mt-4 flex items-center gap-2 text-kal-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading your schedule…
          </div>
        ) : plannedSections.length === 0 ? (
          <p className="mt-4 text-sm text-kal-muted">
            {rows.length > 0
              ? "No scheduled review dates yet. Use the form above to set your first date, or save a recall session — it will show up here."
              : "No scheduled review dates yet. After you save a recall session, your next review appears here. Set your target exam in Profile to load syllabus topics for scheduling."}
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            {plannedSections.map((sec) => (
              <div key={sec.id}>
                <h3 className="text-sm font-semibold text-kal-text">{sec.heading}</h3>
                <ul className="mt-2 space-y-2" role="list">
                  {sec.items.map((it) => {
                    const rowBusy = plannedBusyId === it.syllabusId;
                    return (
                      <li
                        key={it.syllabusId}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                      >
                        <div className="flex min-h-10 items-start justify-between gap-2">
                          {it.row ? (
                            <button
                              type="button"
                              onClick={() => pickTopic(it.row!)}
                              className="min-w-0 flex-1 text-left text-sm text-kal-text transition hover:text-kal-accent"
                            >
                              {it.display}
                            </button>
                          ) : (
                            <span className="min-w-0 flex-1 text-sm text-kal-text">
                              {it.display}
                            </span>
                          )}
                          <time
                            className="shrink-0 text-[11px] font-medium tabular-nums text-kal-muted"
                            dateTime={it.nextDate}
                          >
                            {it.nextDate}
                          </time>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {it.nextDate !== today ? (
                            <button
                              type="button"
                              onClick={() => onMovePlannedReviewToToday(it)}
                              disabled={rowBusy}
                              className="rounded-lg border border-kal-border bg-kal-card/40 px-2.5 py-1.5 text-xs font-medium text-kal-text hover:border-kal-accent/40 disabled:opacity-50"
                            >
                              Move review to today
                            </button>
                          ) : null}
                          {it.row ? (
                            <button
                              type="button"
                              onClick={() => void onAddPlannedToDailyPlan(it)}
                              disabled={rowBusy}
                              className="rounded-lg border border-kal-accent/35 bg-kal-accent/10 px-2.5 py-1.5 text-xs font-semibold text-kal-accent hover:bg-kal-accent/20 disabled:opacity-50"
                            >
                              Add to today&apos;s plan
                            </button>
                          ) : null}
                          <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-kal-muted">
                            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <input
                              type="date"
                              className="rounded-lg border border-kal-border bg-kal-input-bg px-2 py-1 text-sm text-kal-text"
                              value={rescheduleDraft[it.syllabusId] ?? it.nextDate}
                              onChange={(e) =>
                                setRescheduleDraft((p) => ({
                                  ...p,
                                  [it.syllabusId]: e.target.value,
                                }))
                              }
                              disabled={rowBusy}
                            />
                            <button
                              type="button"
                              onClick={() => onApplyPlannedReschedule(it)}
                              disabled={rowBusy}
                              className="font-semibold text-kal-accent underline-offset-2 hover:underline disabled:opacity-50"
                            >
                              Set date
                            </button>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="kal-glass-panel flex flex-col justify-between gap-3 rounded-2xl p-5 sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-kal-text-secondary">
              Streak
            </p>
            <p className="mt-1 flex items-center gap-2 text-3xl font-bold tabular-nums text-kal-text">
              <Flame className="h-8 w-8 text-orange-500" />
              {dataLoading ? "—" : streak.streak} days
            </p>
            <p className="mt-2 text-sm text-kal-muted">
              {streak.streak > 0
                ? "Consistency counts more than perfect days."
                : "Log a session today to start a streak that reflects reality."}
            </p>
          </div>
        </div>
        <div className="kal-glass-panel rounded-2xl p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-kal-text-secondary">
            Revisions (last 12 weeks)
          </p>
          <div className="mt-3 flex max-w-full flex-wrap gap-0.5" aria-label="Revision heatmap">
            {heatmapGrid.map((c) => (
              <div
                key={c.date}
                title={`${c.date}: ${c.count} session(s)`}
                className={clsx(
                  "h-2.5 w-2.5 rounded-[2px] sm:h-3 sm:w-3",
                  c.count === 0 && "bg-kal-border/50",
                  c.count === 1 && "bg-kal-accent/35",
                  c.count >= 2 && c.count < 4 && "bg-kal-accent/55",
                  c.count >= 4 && "bg-kal-accent",
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-kal-muted">Darker = more touch-ups that day</p>
        </div>
      </div>

      <EngineCard title="Danger zone">
        <p className="text-sm text-kal-text-secondary">
          Most likely to slip: overdue reviews and stale touch-ups. Pick one; small wins add up.
        </p>
        {danger.length === 0 ? (
          <p className="mt-2 text-sm text-kal-muted">You are in decent shape for now.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {danger.map((d) => (
              <li
                key={d.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5"
              >
                <span>
                  <span className="font-medium text-kal-text">{d.label}</span>
                  <span className="block text-xs text-kal-muted">{d.reason}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const r = rowById.get(d.id);
                    if (r) pickTopic(r);
                  }}
                  className="shrink-0 text-xs font-semibold text-kal-accent"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </EngineCard>

      <EngineCard title="Active recall">
        <p className="text-sm text-kal-text-secondary">
          Optional but powerful. Summarize the topic in your own words, then rate confidence. Stars set the next review date — you can change the date anytime.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <div
            ref={topicSearchWrapRef}
            className="relative min-w-0 flex-1 text-xs text-kal-muted"
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <span id="active-topic-label">Active topic</span>
              {activeTopicId || topicQuery.trim().length > 0 ? (
                <button
                  type="button"
                  onClick={clearActiveTopic}
                  className="text-xs font-medium text-kal-accent underline"
                >
                  Clear topic
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-kal-muted">
              Search your syllabus below, or type any topic name — it does not have to be in the
              tracker.
            </p>
            <input
              ref={topicInputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={topicPickerOpen}
              aria-controls={TOPIC_LISTBOX_ID}
              aria-labelledby="active-topic-label"
              id="active-recall-topic-combobox"
              name="activeRecallTopic"
              autoComplete="off"
              value={topicQuery}
              onChange={(e) => {
                const v = e.target.value;
                setTopicQuery(v);
                if (activeTopicId) {
                  const r = rowById.get(activeTopicId);
                  if (r && v !== formatTopicDisplay(r)) {
                    setActiveTopicId(null);
                  }
                }
                setTopicPickerOpen(v.trim().length > 0);
              }}
              onFocus={() => {
                if (topicQuery.trim().length > 0) {
                  setTopicPickerOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setTopicPickerOpen(false);
                }
              }}
              placeholder="Search syllabus or type your own topic…"
              className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-muted outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/30"
            />
            {topicPickerOpen && topicQuery.trim().length > 0 ? (
              <ul
                id={TOPIC_LISTBOX_ID}
                role="listbox"
                className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-kal-border/80 bg-kal-card/95 p-1 shadow-lg backdrop-blur dark:border-white/10 dark:bg-kal-page/95"
                aria-label="Matching syllabus topics"
              >
                {filteredTopicRows.length === 0 ? (
                  <li className="px-3 py-2.5 text-sm text-kal-muted" role="presentation">
                    No syllabus matches. You can still use the text in the field as a custom topic
                    and save below.
                  </li>
                ) : (
                  filteredTopicRows.map((r) => {
                    const id = normalizeSyllabusMasterId(String(r.id));
                    return (
                      <li key={id} role="presentation" className="min-w-0">
                        <button
                          type="button"
                          role="option"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickTopic(r)}
                          className="flex w-full min-h-[2.5rem] flex-col items-stretch gap-0.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-kal-accent/10"
                        >
                          <span className="font-medium text-kal-text">
                            {rowLabel(r)}
                          </span>
                          <span className="text-xs text-kal-muted">
                            {(r.chapter ?? "").trim() && `${r.chapter} · `}
                            {r.subject}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : null}
          </div>
        </div>

        <label className="mt-4 block text-xs text-kal-muted">
          Your recall (type or use voice on desktop Chrome / Edge)
          <textarea
            value={recallText}
            onChange={(e) => {
              setRecallText(e.target.value);
            }}
            rows={4}
            placeholder="Explain concepts, list formulas, or walk through one solid problem…"
            className="mt-1.5 w-full rounded-2xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/30"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void onGetAiFeedback()}
            disabled={groqLoading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-kal-border px-4 text-sm font-medium hover:bg-kal-card-muted disabled:opacity-50"
          >
            {groqLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Get AI feedback (typed)
          </button>

          {voiceUnlocked ? (
            <>
              {isListening ? (
                <button
                  type="button"
                  onClick={() => stopListening()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-500/20 px-4 text-sm font-semibold text-red-200"
                >
                  Stop listening
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartVoice}
                  disabled={!isSupported}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-kal-accent/15 px-4 text-sm font-semibold text-kal-accent"
                >
                  <Mic className="h-4 w-4" />
                  Speak to revise
                </button>
              )}
              {recallText && (
                <button
                  type="button"
                  onClick={() => void onEvaluateVoice()}
                  disabled={groqLoading}
                  className="text-sm font-medium text-kal-accent underline"
                >
                  Evaluate voice recall
                </button>
              )}
            </>
          ) : (
            <span className="text-xs text-kal-muted">
              <Link href="/pricing" className="text-kal-accent underline">
                Upgrade
              </Link>{" "}
              for voice + AI quality scoring (uses your study voice quota like Dictate my Day).
            </span>
          )}
        </div>

        {groqFeedback ? (
          <p className="mt-3 rounded-2xl border border-kal-accent/25 bg-kal-accent/5 p-3 text-sm text-kal-text">
            {groqFeedback.text}
            {groqFeedback.model ? (
              <span className="mt-1 block text-[10px] text-kal-muted">{groqFeedback.model}</span>
            ) : null}
          </p>
        ) : null}

        <div className="mt-4">
          <p className="text-xs font-medium text-kal-muted">Confidence (affects next review date)</p>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                className={clsx(
                  "rounded-lg p-1.5",
                  n <= stars ? "text-amber-400" : "text-kal-border",
                )}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                <Star className="h-6 w-6" fill="currentColor" />
              </button>
            ))}
          </div>
          {nextSuggestedForStars ? (
            <p className="mt-2 text-xs text-kal-muted">
              Suggested next review:{" "}
              <span className="font-medium text-kal-text">
                {nextSuggestedForStars.suggested}
              </span>{" "}
              (about {nextSuggestedForStars.minDays}–{nextSuggestedForStars.maxDays} days from
              now)
            </p>
          ) : null}
          <label className="mt-2 block text-xs text-kal-muted">
            Optional: override next review date
            <input
              type="date"
              className="mt-1.5 w-full max-w-xs rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm"
              value={overrideDate ?? ""}
              onChange={(e) => setOverrideDate(e.target.value || null)}
            />
          </label>
        </div>

        {sessionNotice ? (
          <p className="mt-2 text-sm text-kal-text-secondary">{sessionNotice}</p>
        ) : null}

        <button
          type="button"
          onClick={() => void onSaveSession()}
          disabled={saving}
          className="kal-btn-accent mt-4 w-full min-h-12 rounded-2xl text-sm font-semibold"
        >
          {saving ? "Saving…" : "Save session & schedule next review"}
        </button>
      </EngineCard>
    </div>
  );
}
