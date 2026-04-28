"use client";

import clsx from "clsx";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  GripVertical,
  Loader2,
  Mic,
  PencilLine,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { VoiceListeningHint } from "@/components/voice/VoiceListeningHint";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { useDoubtSyllabusSubjects } from "@/hooks/useDoubtSyllabusSubjects";
import { useDoubtSyllabusTopicOptions } from "@/hooks/useDoubtSyllabusTopicOptions";
import { usePrepBrainContextSnapshot } from "@/hooks/usePrepBrainContextSnapshot";
import type { DoubtStatus } from "@/lib/doubtStorage";
import {
  normalizeStoredDoubtSubject,
  normalizeStoredDoubtTopic,
  resolveSubjectAgainstCatalog,
} from "@/lib/doubtSubjects";
import { VOICE_MAX_SESSION_MS, VOICE_SILENCE_AUTO_STOP_MS } from "@/lib/voiceConstants";
import { resolveTopicLineAgainstCatalog } from "@/lib/doubtVoiceTagSyllabus";
import { trimPrepBrainContextForDoubtTag } from "@/lib/prepBrainContextTrimForDoubt";
import { surfaceOptionalString } from "@/lib/userFacingErrors";
import { isLikelyImageFile } from "@/lib/purposeStorage";
import { useAuthStore } from "@/store/useAuthStore";
import { useDoubtStore } from "@/store/useDoubtStore";
import { useUndoStore } from "@/store/useUndoStore";
import { AddDoubtSheet } from "@/components/doubts/AddDoubtSheet";
import { DoubtSubjectSelect } from "@/components/doubts/DoubtSubjectSelect";
import { DoubtTopicSelect } from "@/components/doubts/DoubtTopicSelect";
import { VoiceMinuteLimitLink } from "@/components/subscription/LimitExceededLinks";
import { VoiceDoubtPreviewSheet } from "@/components/doubts/VoiceDoubtPreviewSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LocalPhotoPrivacyNote } from "@/components/ui/LocalPhotoPrivacyNote";
import { TransientNotice } from "@/components/ui/TransientNotice";
import { DoubtsEmptyIllustration } from "@/components/illustrations/DoubtsEmptyIllustration";

type ColumnDef = {
  status: DoubtStatus;
  title: string;
  empty: string;
  panelClass: string;
  headingClass: string;
};

const COLUMNS: ColumnDef[] = [
  {
    status: "current",
    title: "Current Doubts",
    empty: "No active doubts — keep conquering the syllabus",
    panelClass:
      "kal-glass-panel border-white/25 dark:border-white/12",
    headingClass: "text-kal-text dark:text-slate-200",
  },
  {
    status: "working",
    title: "Working on it",
    empty:
      "Nothing here yet — move a doubt here when you start breaking it down",
    panelClass:
      "border-violet-200/80 bg-violet-50/90 shadow-sm backdrop-blur-md dark:border-violet-500/30 dark:bg-violet-950/35",
    headingClass:
      "text-violet-900 dark:text-violet-200/95",
  },
  {
    status: "solved",
    title: "Solved Doubts",
    empty: "All doubts solved — great progress!",
    panelClass:
      "border-emerald-200/70 bg-emerald-50/80 shadow-sm backdrop-blur-md dark:border-emerald-500/30 dark:bg-emerald-950/30",
    headingClass:
      "text-emerald-900 dark:text-emerald-200/95",
  },
];

function usePhotoUrl(doubtId: string, photoId: string) {
  const url = useDoubtStore(
    (s) => s.photoUrls[`${doubtId}::${photoId}`],
  );
  return url;
}

function DoubtPhotoThumb({
  doubtId,
  photoId,
  onRemove,
}: {
  doubtId: string;
  photoId: string;
  onRemove?: () => void;
}) {
  const url = usePhotoUrl(doubtId, photoId);
  if (!url) return null;
  return (
    <div className="group/thumb relative inline-block overflow-hidden rounded-lg border border-kal-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="h-16 w-16 object-cover sm:h-20 sm:w-20"
      />
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100"
          aria-label="Remove photo"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

const STATUS_ORDER: DoubtStatus[] = ["current", "working", "solved"];

function shiftDoubtStatus(
  status: DoubtStatus,
  delta: -1 | 1,
): DoubtStatus | null {
  const i = STATUS_ORDER.indexOf(status);
  const next = i + delta;
  if (next < 0 || next >= STATUS_ORDER.length) return null;
  return STATUS_ORDER[next]!;
}

function compareByUpdatedAtDesc(
  a: { updatedAt: number },
  b: { updatedAt: number },
): number {
  return b.updatedAt - a.updatedAt;
}

/** Full-sentence line for card footer (readability). */
function formatDoubtAddedSentence(timestamp: number): string {
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays >= 1 && diffDays <= 5) {
    return diffDays === 1
      ? "Added one day ago."
      : `Added ${diffDays} days ago.`;
  }
  if (diffDays === 0) {
    return "Added today.";
  }
  const datePart = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp));
  return `Added on ${datePart}.`;
}

const VOICE_LANGS: { value: string; label: string }[] = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "en-US", label: "English (US)" },
];

export function DoubtTracker() {
  const baseId = useId();
  const user = useAuthStore((s) => s.user);
  const { subjects: syllabusSubjects, subjectsByExam } = useDoubtSyllabusSubjects();
  const { linesForSubject } = useDoubtSyllabusTopicOptions();
  const { buildContextSnapshot } = usePrepBrainContextSnapshot();
  const {
    doubts,
    hydrated,
    hydrateError,
    hydrate,
    updateDoubtText,
    setDoubtStatus,
    addPhoto,
    removePhoto,
    deleteDoubt,
    restoreDoubt,
  } = useDoubtStore();

  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const [voiceLang, setVoiceLang] = useState("en-IN");
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceDoubtQuotaHit, setVoiceDoubtQuotaHit] = useState(false);
  const [voicePreviewOpen, setVoicePreviewOpen] = useState(false);
  const [voicePreview, setVoicePreview] = useState({
    title: "",
    subject: "",
    topic: "",
    groqModel: "",
    tagNote: null as string | null,
    voiceSecondsCharged: null as number | null,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [dragOver, setDragOver] = useState<DoubtStatus | null>(null);
  const dragCountRef = useRef<Partial<Record<DoubtStatus, number>>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteBanner, setDeleteBanner] = useState<string | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("__all__");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (editingId && !doubts.some((d) => d.id === editingId)) {
      setEditingId(null);
    }
  }, [editingId, doubts]);

  const filteredDoubts = useMemo(() => {
    if (subjectFilter === "__all__") return doubts;
    if (subjectFilter === "__none__") {
      return doubts.filter((d) => !normalizeStoredDoubtSubject(d.subject));
    }
    return doubts.filter(
      (d) => normalizeStoredDoubtSubject(d.subject) === subjectFilter,
    );
  }, [doubts, subjectFilter]);

  const filterChoices = useMemo(() => {
    const fromDoubts = doubts
      .map((d) => normalizeStoredDoubtSubject(d.subject))
      .filter((s): s is string => Boolean(s));
    const merged = new Set<string>([...syllabusSubjects, ...fromDoubts]);
    const sorted = [...merged].sort((a, b) => a.localeCompare(b));
    return [
      { key: "__all__", label: "All" },
      { key: "__none__", label: "No subject" },
      ...sorted.map((s) => ({ key: s, label: s })),
    ];
  }, [doubts, syllabusSubjects]);

  const voiceSubjectSelectOptions = useMemo(() => {
    const set = new Set(syllabusSubjects);
    const v = voicePreview.subject?.trim();
    if (v) set.add(v);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [syllabusSubjects, voicePreview.subject]);

  const cardNumberById = useMemo(() => {
    const byStatusAll: Record<DoubtStatus, typeof doubts> = {
      current: [],
      working: [],
      solved: [],
    };
    for (const d of doubts) {
      byStatusAll[d.status].push(d);
    }
    const out: Record<string, number> = {};
    for (const k of Object.keys(byStatusAll) as DoubtStatus[]) {
      byStatusAll[k].sort(compareByUpdatedAtDesc);
      for (const [index, d] of byStatusAll[k].entries()) {
        out[d.id] = index + 1;
      }
    }
    return out;
  }, [doubts]);

  const byStatus = useMemo(() => {
    const m: Record<DoubtStatus, typeof doubts> = {
      current: [],
      working: [],
      solved: [],
    };
    for (const d of filteredDoubts) {
      m[d.status].push(d);
    }
    for (const k of Object.keys(m) as DoubtStatus[]) {
      m[k].sort(compareByUpdatedAtDesc);
    }
    return m;
  }, [filteredDoubts]);

  const editing = editingId
    ? doubts.find((d) => d.id === editingId)
    : undefined;

  // Key off `editingId` (primitive) so this only re-fires when the selected
  // item changes, not on every store update that creates a new object reference.
  useEffect(() => {
    if (!editingId) return;
    const found = doubts.find((d) => d.id === editingId);
    if (found) {
      setEditTitle(found.title);
      setEditDesc(found.description);
      setEditSubject(normalizeStoredDoubtSubject(found.subject) ?? "");
      setEditTopic(normalizeStoredDoubtTopic(found.topic) ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  useEffect(() => {
    if (!editing) return;
    const opts = linesForSubject(editSubject);
    if (editTopic && opts.length > 0 && !opts.includes(editTopic)) {
      setEditTopic("");
    }
  }, [editing, editSubject, editTopic, linesForSubject]);

  const handleVoiceTranscript = useCallback(
    async (transcript: string, durationSeconds: number) => {
      const parts = transcript.trim().split(/\s+/).filter(Boolean);
      const deduped: string[] = [];
      for (const p of parts) {
        if (deduped[deduped.length - 1] === p) continue;
        deduped.push(p);
      }
      const cleaned = deduped.join(" ");
      if (!cleaned) {
        setVoiceError("No speech captured. Try again.");
        return;
      }
      if (!user?.id) {
        setVoiceError("Sign in to record a voice doubt.");
        return;
      }
      setVoiceProcessing(true);
      setVoiceError(null);
      setVoiceDoubtQuotaHit(false);
      try {
        let prepTrim: Record<string, unknown> | undefined;
        try {
          const ctx = await buildContextSnapshot();
          prepTrim = trimPrepBrainContextForDoubtTag(ctx);
        } catch {
          prepTrim = undefined;
        }

        const parseRes = await fetch("/api/doubt-voice-tag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            transcript: cleaned,
            prepbrain_context_trim: prepTrim,
            durationSeconds,
          }),
        });

        const data = (await parseRes.json()) as {
          ok?: boolean;
          doubt_text?: string;
          subject?: string | null;
          topic?: string | null;
          groq_model?: string;
          tag_note?: string;
          error?: string;
          voice_seconds_charged?: number;
        };

        if (!parseRes.ok || !data.ok) {
          setVoiceDoubtQuotaHit(parseRes.status === 429);
          setVoiceError(
            surfaceOptionalString(
              data.error,
              "Could not tag this doubt. Try again.",
            ),
          );
          return;
        }

        const title = (data.doubt_text ?? cleaned).slice(0, 600);
        const apiSubject =
          typeof data.subject === "string" ? data.subject.trim() : "";
        const catalogForSubject = [
          ...new Set([...syllabusSubjects, ...(apiSubject ? [apiSubject] : [])]),
        ];
        const subject = apiSubject
          ? resolveSubjectAgainstCatalog(apiSubject, catalogForSubject)
          : "";

        const apiTopic =
          typeof data.topic === "string" ? data.topic.trim() : "";
        const topicLineSet = new Set(linesForSubject(subject));
        const topic = apiTopic
          ? resolveTopicLineAgainstCatalog(apiTopic, topicLineSet) ?? ""
          : "";

        const charged =
          typeof data.voice_seconds_charged === "number"
            ? data.voice_seconds_charged
            : null;
        setVoicePreview({
          title,
          subject,
          topic,
          groqModel: typeof data.groq_model === "string" ? data.groq_model : "",
          tagNote:
            typeof data.tag_note === "string" && data.tag_note.trim()
              ? data.tag_note.trim()
              : null,
          voiceSecondsCharged: charged,
        });
        setVoicePreviewOpen(true);
      } catch {
        setVoiceError("Network error. Try again.");
      } finally {
        setVoiceProcessing(false);
      }
    },
    [user, buildContextSnapshot, syllabusSubjects, linesForSubject],
  );

  const {
    clearError: clearVoiceRecError,
    error: voiceRecError,
    isListening: voiceListening,
    isSupported: voiceSupported,
    startListening: startVoiceListening,
    stopListening: stopVoiceListening,
  } = useDeviceSpeechRecognition({
    lang: voiceLang,
    maxSessionMs: VOICE_MAX_SESSION_MS,
    silenceMs: VOICE_SILENCE_AUTO_STOP_MS,
    onStart: () => {
      setVoiceError(null);
      setVoiceDoubtQuotaHit(false);
      clearVoiceRecError();
    },
    onTranscript: ({ transcript, durationSeconds }) => {
      void handleVoiceTranscript(transcript, durationSeconds);
    },
  });

  const saveEdit = async () => {
    if (!editingId) return;
    setEditSaving(true);
    try {
      await updateDoubtText(editingId, {
        title: editTitle,
        description: editDesc,
        subject: editSubject.trim() === "" ? null : editSubject.trim(),
        topic: editTopic.trim() === "" ? null : editTopic.trim(),
      });
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  };

  const voiceBusy = voiceListening || voiceProcessing;
  const voiceBanner = voiceRecError ?? voiceError;

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-kal-muted">
        <Loader2 className="h-9 w-9 animate-spin text-kal-accent" />
        <p className="text-sm">Loading your doubts…</p>
      </div>
    );
  }

  if (hydrateError) {
    return (
      <div className="kal-glass-subtle rounded-xl px-4 py-3 text-xs leading-relaxed text-kal-muted">
        {hydrateError}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 pb-6 sm:space-y-6 sm:pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kal-accent-soft text-kal-accent sm:h-11 sm:w-11 sm:rounded-xl">
              <CircleHelp className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-kal-accent sm:text-[0.65rem] sm:tracking-widest">
                Exam prep
              </p>
              <h1 className="kal-feature-title">Doubt Tracker</h1>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500/90 dark:text-zinc-400">
            Doubts, notes, and photos are stored only in this browser on this
            device. They are not saved on our servers and may be permanently
            lost if you clear browser data or cache.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[14rem]">
          <div className="flex flex-wrap items-stretch gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setAddSheetOpen(true)}
              className="kal-btn-accent flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs active:scale-[0.99] sm:min-h-[52px] sm:flex-initial sm:px-6 sm:py-3.5 sm:text-sm"
            >
              <Plus className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
              Add doubt
            </button>
            <button
              type="button"
              disabled={
                voiceBusy ||
                !voiceSupported ||
                !user?.id ||
                voicePreviewOpen
              }
              onClick={() => {
                if (!user?.id) {
                  setVoiceError("Sign in to record a voice doubt.");
                  return;
                }
                if (!voiceSupported) return;
                if (voiceListening) stopVoiceListening();
                else void startVoiceListening();
              }}
              title={
                !user?.id
                  ? "Sign in to use voice"
                  : !voiceSupported
                    ? "Speech recognition not supported"
                    : voiceListening
                      ? "Stop recording"
                      : "Record doubt (voice)"
              }
              className={clsx(
                "flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border-2 px-4 transition active:scale-[0.99] sm:min-h-[52px] sm:min-w-[52px] sm:px-5",
                voiceListening
                  ? "border-red-400/80 bg-red-500/15 text-red-700 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200"
                  : "border-kal-accent/40 bg-kal-accent-soft text-kal-accent-dark hover:border-kal-accent/60 dark:bg-kal-accent/12 dark:text-kal-accent",
                (voiceBusy && !voiceListening) || !voiceSupported || !user?.id
                  ? "opacity-45"
                  : "",
              )}
              aria-pressed={voiceListening}
              aria-label={
                voiceListening ? "Stop recording doubt" : "Record doubt"
              }
            >
              {voiceProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              )}
            </button>
          </div>
          <label className="block text-[10px] font-medium text-kal-muted sm:text-right">
            <span className="sr-only">Speech language</span>
            <select
              value={voiceLang}
              disabled={voiceListening || voiceProcessing}
              onChange={(e) => setVoiceLang(e.target.value)}
              className="mt-0.5 w-full min-h-[40px] rounded-lg border border-kal-border bg-kal-input-bg px-2 py-1.5 text-[11px] text-kal-text sm:ml-auto sm:w-auto"
            >
              {VOICE_LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          {voiceBanner ? (
            <div className="text-center sm:text-right">
              <p
                role="alert"
                className="text-[11px] text-orange-700 dark:text-orange-300/95"
              >
                {voiceBanner}
              </p>
              {voiceDoubtQuotaHit && !voiceRecError ? (
                <div className="mt-1.5 text-[10px] text-kal-text [&_a]:text-kal-accent">
                  <VoiceMinuteLimitLink />
                </div>
              ) : null}
            </div>
          ) : voiceListening ? (
            <div className="w-full sm:text-right">
              <VoiceListeningHint
                visible
                variant="dictation"
                className="!text-right"
              />
            </div>
          ) : null}
        </div>
      </header>

      <div className="space-y-2">
        <p className="text-[11px] font-medium text-kal-muted">Subject filter</p>
        <div
          className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-0.5 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0"
          role="tablist"
          aria-label="Filter doubts by subject"
        >
          {filterChoices.map((c) => {
            const selected = subjectFilter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSubjectFilter(c.key)}
                className={clsx(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  selected
                    ? "border-kal-accent/45 bg-kal-accent-soft text-kal-accent-dark shadow-sm dark:border-kal-accent/30 dark:bg-kal-accent/12 dark:text-kal-accent-dark"
                    : "border-kal-border bg-kal-card-muted/80 text-kal-muted hover:border-kal-accent/25 hover:bg-kal-card-muted",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={clsx(
          "flex min-w-0 gap-3 sm:gap-4",
          "-mx-4 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-4 pb-1 [-webkit-overflow-scrolling:touch] scroll-pl-4 scroll-pr-4",
          "sm:-mx-6 sm:px-6 sm:scroll-pl-6 sm:scroll-pr-6",
          "md:mx-0 md:grid md:grid-cols-3 md:items-start md:gap-5 md:overflow-visible md:px-0 md:pb-0 md:snap-none md:scroll-pr-0 md:scroll-pl-0",
          "lg:gap-6 xl:gap-8",
        )}
        role="region"
        aria-label="Doubt columns — swipe sideways on small screens"
      >
        {COLUMNS.map((col) => (
          <section
            key={col.status}
            className={clsx(
              "flex min-h-0 w-[min(22rem,calc(100vw-2.5rem))] shrink-0 snap-center flex-col rounded-xl border p-4 sm:w-[min(24rem,calc(100vw-3rem))] sm:rounded-2xl sm:p-5",
              "md:w-auto md:min-w-0 md:shrink md:snap-normal md:min-h-[min(32rem,calc(100dvh-13rem))] lg:p-6",
              col.panelClass,
              dragOver === col.status &&
                "ring-2 ring-kal-accent/50 ring-offset-2 ring-offset-kal-page",
            )}
            onDragEnter={() => {
              dragCountRef.current[col.status] = (dragCountRef.current[col.status] ?? 0) + 1;
              setDragOver(col.status);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDragLeave={() => {
              const count = (dragCountRef.current[col.status] ?? 1) - 1;
              dragCountRef.current[col.status] = count;
              if (count <= 0) {
                dragCountRef.current[col.status] = 0;
                setDragOver(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              dragCountRef.current[col.status] = 0;
              setDragOver(null);
              const id = e.dataTransfer.getData("text/doubt-id");
              if (id) void setDoubtStatus(id, col.status);
            }}
          >
            <h2
              className={clsx(
                "flex shrink-0 items-center justify-between gap-2 border-b border-kal-border pb-2 text-xs font-bold tracking-tight dark:border-white/[0.06] sm:pb-3 sm:text-sm",
                col.headingClass,
              )}
            >
              <span>{col.title}</span>
              <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full border border-current/25 px-1.5 py-0.5 text-[10px] font-semibold leading-none sm:min-w-[1.625rem] sm:text-[11px]">
                {byStatus[col.status].length}
              </span>
            </h2>
            <div className="mt-2 flex min-h-[min(52dvh,22rem)] flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch] sm:mt-3 sm:min-h-[min(56dvh,24rem)] sm:gap-2.5 md:min-h-0 md:max-h-[calc(100dvh-15.5rem)] lg:max-h-[calc(100dvh-14rem)]">
              {byStatus[col.status].length === 0 ? (
                <div className="kal-glass-subtle flex flex-col items-center rounded-lg border border-dashed border-white/35 px-2.5 py-4 text-center sm:rounded-xl sm:px-3 sm:py-6 dark:border-white/15">
                  {col.status === "current" && doubts.length === 0 && (
                    <DoubtsEmptyIllustration className="mb-2 h-28 w-28 opacity-80" />
                  )}
                  <p className="text-[11px] leading-relaxed text-kal-muted sm:text-[12px]">
                    {col.empty}
                  </p>
                </div>
              ) : (
                byStatus[col.status].map((d) => (
                  <article
                    key={d.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/doubt-id", d.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="kal-glass-subtle group cursor-grab rounded-lg p-2.5 transition hover:border-kal-accent/30 active:cursor-grabbing sm:rounded-xl sm:p-3 lg:p-3.5"
                  >
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      <div
                        className="mt-px shrink-0 text-kal-muted sm:mt-0.5"
                        aria-hidden
                      >
                        <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <button
                          type="button"
                          onClick={() => setEditingId(d.id)}
                          className="w-full text-left"
                        >
                          <p className="text-[10px] font-semibold leading-none text-kal-muted sm:text-[11px]">
                            #{cardNumberById[d.id] ?? "–"}
                          </p>
                          <p className="break-words text-sm font-semibold leading-snug text-kal-text sm:text-[15px]">
                            {d.title.trim() ? (
                              d.title
                            ) : (
                              <span className="font-medium text-kal-muted">
                                Untitled
                              </span>
                            )}
                          </p>
                          {normalizeStoredDoubtSubject(d.subject) ? (
                            <span className="mt-1 inline-block min-w-0 max-w-full truncate rounded-full border border-kal-border bg-kal-card-muted/90 px-2 py-0.5 text-[10px] font-medium text-kal-text-secondary sm:text-[11px] dark:bg-zinc-800/75 dark:text-zinc-300">
                              {normalizeStoredDoubtSubject(d.subject)}
                            </span>
                          ) : null}
                          {normalizeStoredDoubtTopic(d.topic) ? (
                            <span className="mt-1 block min-w-0 max-w-full truncate rounded-md border border-kal-border/80 bg-kal-page/80 px-2 py-0.5 text-[10px] text-kal-muted sm:text-[11px] dark:bg-zinc-900/40">
                              {normalizeStoredDoubtTopic(d.topic)}
                            </span>
                          ) : null}
                          {d.description.trim() ? (
                            <p className="mt-0.5 line-clamp-3 break-words text-[11px] leading-relaxed text-kal-muted sm:mt-1 sm:text-[12px]">
                              {d.description}
                            </p>
                          ) : null}
                        </button>
                        {d.photoIds.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {d.photoIds.map((pid) => (
                              <button
                                key={pid}
                                type="button"
                                className="overflow-hidden rounded-lg ring-1 ring-kal-border"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const u =
                                    useDoubtStore.getState().photoUrls[
                                      `${d.id}::${pid}`
                                    ];
                                  if (u) setLightbox(u);
                                }}
                              >
                                <DoubtPhotoThumb doubtId={d.id} photoId={pid} />
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-2 w-full text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                          {formatDoubtAddedSentence(d.createdAt)}
                        </p>
                        <div className="mt-2 flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(d.id);
                              }}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-kal-border text-kal-muted transition-opacity hover:bg-kal-card-muted hover:text-kal-text md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                              aria-label="Edit doubt"
                            >
                              <PencilLine className="h-4 w-4" strokeWidth={2.25} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDeleteId(d.id);
                              }}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-orange-500/90 transition-opacity hover:bg-orange-100/60 hover:text-orange-600 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
                              aria-label="Delete doubt"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                            </button>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={!shiftDoubtStatus(d.status, -1)}
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = shiftDoubtStatus(d.status, -1);
                                if (next) void setDoubtStatus(d.id, next);
                              }}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-kal-border text-kal-muted transition hover:bg-kal-card-muted hover:text-kal-text disabled:opacity-30 disabled:hover:bg-transparent"
                              aria-label="Move left"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={!shiftDoubtStatus(d.status, 1)}
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = shiftDoubtStatus(d.status, 1);
                                if (next) void setDoubtStatus(d.id, next);
                              }}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-kal-border text-kal-muted transition hover:bg-kal-card-muted hover:text-kal-text disabled:opacity-30 disabled:hover:bg-transparent"
                              aria-label="Move right"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <TransientNotice
        message={deleteBanner}
        onDismiss={() => setDeleteBanner(null)}
        variant="amber"
      />
      <TransientNotice
        message={inlineNotice}
        onDismiss={() => setInlineNotice(null)}
        variant="amber"
      />

      <p className="text-center text-[10px] leading-relaxed text-kal-text-secondary sm:text-[11px]">
        Use the arrows on each card to move between Current → Working → Solved.
        You can still swipe columns on mobile or drag on larger screens. Use
        Edit on each card to update details (or tap the title and notes).
        Stored on this device only.
      </p>

      <ConfirmDialog
        open={pendingDeleteId != null}
        title="Delete doubt?"
        description="Delete this doubt permanently?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        busy={deleteBusy}
        onCancel={() => !deleteBusy && setPendingDeleteId(null)}
        onConfirm={() => {
          const id = pendingDeleteId;
          if (!id) return;
          const meta = doubts.find((d) => d.id === id);
          if (!meta) {
            setPendingDeleteId(null);
            return;
          }
          const urls = useDoubtStore.getState().photoUrls;
          const photoDataUrls: Record<string, string> = {};
          for (const pid of meta.photoIds) {
            const u = urls[`${meta.id}::${pid}`];
            if (u) photoDataUrls[pid] = u;
          }
          setDeleteBusy(true);
          setDeleteBanner(null);
          void (async () => {
            try {
              await deleteDoubt(id);
              setEditingId((prev) => (prev === id ? null : prev));
              setPendingDeleteId(null);
              useUndoStore.getState().offerUndo({
                message: "Doubt removed",
                runUndo: async () => {
                  await restoreDoubt(meta, photoDataUrls);
                },
              });
            } catch {
              setDeleteBanner(
                "Could not delete this doubt. Please try again.",
              );
              setPendingDeleteId(null);
            } finally {
              setDeleteBusy(false);
            }
          })();
        }}
      />

      {/* Edit */}
      {editing && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${baseId}-edit-title`}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/65"
            onClick={() => !editSaving && setEditingId(null)}
          />
          <div className="kal-glass-panel relative z-[61] flex min-h-0 w-full max-w-lg max-h-[min(92dvh,36rem)] flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl">
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-kal-border px-6 pb-3 pt-6">
              <h2
                id={`${baseId}-edit-title`}
                className="text-lg font-bold text-kal-text"
              >
                Edit doubt
              </h2>
              <button
                type="button"
                onClick={() => !editSaving && setEditingId(null)}
                className="rounded-lg p-2 text-kal-muted hover:bg-kal-card-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4 [-webkit-overflow-scrolling:touch]">
            <label className="block text-xs font-medium text-kal-muted">
              Title
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-3 text-base text-kal-text outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40"
              />
            </label>
            <label className="mt-4 block text-xs font-medium text-kal-muted">
              Details
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={5}
                className="mt-1.5 w-full resize-y rounded-xl border border-kal-border bg-kal-input-bg px-3 py-3 text-base text-kal-text outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40"
              />
            </label>
            <DoubtSubjectSelect
              id={`${baseId}-edit-subject`}
              className="mt-4"
              value={editSubject}
              onChange={(next) => {
                setEditSubject(next);
                setEditTopic("");
              }}
              options={syllabusSubjects}
              disabled={editSaving}
            />
            <DoubtTopicSelect
              id={`${baseId}-edit-topic`}
              className="mt-4"
              value={editTopic}
              onChange={setEditTopic}
              options={linesForSubject(editSubject)}
              disabled={editSaving}
            />
            <div className="mt-4">
              <p className="text-xs font-medium text-kal-muted">Photos</p>
              <LocalPhotoPrivacyNote className="mt-2" />
              <input
                id={`${baseId}-edit-photo-input`}
                type="file"
                accept="image/*"
                multiple
                disabled={editSaving}
                className="sr-only"
                onChange={(e) => {
                  const files = e.target.files;
                  e.target.value = "";
                  if (!files?.length || !editing) return;
                  for (const f of Array.from(files)) {
                    if (isLikelyImageFile(f)) void addPhoto(editing.id, f);
                  }
                }}
              />
              <label
                htmlFor={`${baseId}-edit-photo-input`}
                className={clsx(
                  "mt-2 flex w-full min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-kal-accent/35 bg-kal-accent-soft px-4 py-3 text-sm font-semibold text-kal-accent-dark transition hover:bg-kal-accent-soft/80",
                  editSaving && "pointer-events-none cursor-not-allowed opacity-50",
                )}
              >
                <Camera className="h-5 w-5 shrink-0" aria-hidden />
                <span>📸 Add photo</span>
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {editing.photoIds.map((pid) => (
                  <DoubtPhotoThumb
                    key={pid}
                    doubtId={editing.id}
                    photoId={pid}
                    onRemove={() => void removePhoto(editing.id, pid)}
                  />
                ))}
              </div>
            </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-kal-border px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => void saveEdit()}
                className="kal-btn-accent min-h-[48px] flex-1 rounded-xl py-3 text-sm disabled:opacity-50"
              >
                {editSaving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setPendingDeleteId(editing.id)}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-orange-400/40 bg-orange-50/80 py-3 text-sm font-semibold text-orange-700 dark:bg-orange-950/25 dark:text-orange-200"
              >
                <Trash2 className="h-4 w-4" />
                Delete doubt
              </button>
            </div>
          </div>
        </div>
      )}

      <VoiceDoubtPreviewSheet
        open={voicePreviewOpen}
        onClose={() => setVoicePreviewOpen(false)}
        groqModel={voicePreview.groqModel}
        tagNote={voicePreview.tagNote}
        voiceSecondsCharged={voicePreview.voiceSecondsCharged}
        initialTitle={voicePreview.title}
        initialSubject={voicePreview.subject}
        initialTopic={voicePreview.topic}
        syllabusSubjects={voiceSubjectSelectOptions}
        linesForSubject={linesForSubject}
      />

      <AddDoubtSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        syllabusSubjects={syllabusSubjects}
        subjectsByExam={subjectsByExam}
      />

      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          role="presentation"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
