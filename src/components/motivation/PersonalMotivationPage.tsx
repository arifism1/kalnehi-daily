"use client";

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  CalendarDays,
  Camera,
  Check,
  Flame,
  Heart,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Lock,
  Mic,
  Pin,
  Search,
  Sparkles,
  Square,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchMotivationData,
  transcribeMotivationAudio,
  upsertMotivationLetter,
  createMotivationVoiceEntry,
  createMotivationPhotoEntry,
  setMotivationWallpaperPhoto,
} from "@/actions/motivation";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { compressImageFileToDataUrl, isLikelyImageFile } from "@/lib/purposeStorage";
import {
  enqueueMotivationOutbox,
  getMotivationBundleCached,
  mergeBundleFromServer,
  saveMotivationBundleCached,
  type MotivationBundle,
  type MotivationLetterRow,
  type MotivationPhotoRow,
  type MotivationVoiceRow,
} from "@/lib/motivationLocal";
import { MOTIVATION_VOICE_TAGS } from "@/lib/motivationTypes";
import {
  isLetterRevealedInStorage,
  isLetterSealedBeforeOpenDate,
  sanitizeMotivationLettersForToday,
  setLetterRevealedInStorage,
  shouldExcludeLetterFromRandomPull,
  shouldHideLetterBodyInTimeline,
} from "@/lib/motivationLetterDisplay";
import { flushMotivationOutbox } from "@/lib/motivationSync";
import { useAuthStore } from "@/store/useAuthStore";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";
import { ConfettiBurst } from "@/components/ui/ConfettiBurst";

type TabId = "letter" | "voice" | "vision" | "timeline";

function letterStreakDays(
  letters: MotivationLetterRow[],
  today: string,
): number {
  const withLetter = new Set<string>();
  for (const l of letters) {
    const hasContent =
      l.body.trim().length > 0 ||
      (l.sealed === true && !!l.open_date);
    if (hasContent) withLetter.add(l.letter_date);
  }
  let n = 0;
  let d = today;
  while (withLetter.has(d)) {
    n++;
    d = format(addDays(parseISO(d), -1), "yyyy-MM-dd");
  }
  return n;
}

function upsertLetterInList(
  letters: MotivationLetterRow[],
  row: MotivationLetterRow,
): MotivationLetterRow[] {
  const i = letters.findIndex(
    (l) => l.letter_date === row.letter_date && l.user_id === row.user_id,
  );
  if (i >= 0) {
    const next = [...letters];
    next[i] = row;
    return next;
  }
  return [row, ...letters];
}

export function PersonalMotivationPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const [tab, setTab] = useState<TabId>("letter");
  const [bundle, setBundle] = useState<MotivationBundle | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const streak = useMemo(
    () => letterStreakDays(bundle?.letters ?? [], today),
    [bundle?.letters, today],
  );

  const refreshFromRemote = useCallback(async () => {
    if (!userId) return;
    const fresh = await fetchMotivationData();
    if (fresh.ok) {
      const cached = await getMotivationBundleCached(userId);
      const merged = mergeBundleFromServer(cached, {
        letters: sanitizeMotivationLettersForToday(fresh.letters, today),
        voices: fresh.voices,
        photos: fresh.photos,
        prefs: fresh.prefs,
      });
      await saveMotivationBundleCached(merged);
      setBundle(merged);
    }
  }, [userId, today]);

  useEffect(() => {
    if (!userId) {
      setHydrating(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setHydrating(true);
      try {
        const cached = await getMotivationBundleCached(userId);
        if (!cancelled && cached) {
          setBundle({
            ...cached,
            letters: sanitizeMotivationLettersForToday(cached.letters, today),
          });
        }
        await refreshFromRemote();
        await flushMotivationOutbox(userId);
        await refreshFromRemote();
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshFromRemote, today]);

  const todayLetter = useMemo(
    () =>
      bundle?.letters.find(
        (l) => l.letter_date === today && l.user_id === userId,
      ),
    [bundle?.letters, today, userId],
  );

  const storageLetterRevealed =
    userId && todayLetter?.letter_date
      ? isLetterRevealedInStorage(userId, todayLetter.letter_date)
      : false;
  const [letterRevealedOverride, setLetterRevealedOverride] = useState(false);

  useEffect(() => {
    setLetterRevealedOverride(false);
  }, [todayLetter?.letter_date, userId]);

  const revealedForLetter =
    storageLetterRevealed || letterRevealedOverride;

  const sealedBeforeOpen =
    todayLetter && isLetterSealedBeforeOpenDate(todayLetter, today);
  const openDay =
    todayLetter?.open_date?.slice(0, 10) ?? "";
  const sealedReadyToOpen =
    todayLetter?.sealed === true &&
    !!openDay &&
    today >= openDay &&
    !sealedBeforeOpen;

  const [letterBody, setLetterBody] = useState("");
  const [letterSaving, setLetterSaving] = useState(false);
  const [showSealPanel, setShowSealPanel] = useState(false);
  const [sealPickDate, setSealPickDate] = useState("");
  const [sealUndoDeadline, setSealUndoDeadline] = useState<number | null>(null);
  const bodyBeforeSealRef = useRef<string | null>(null);
  const [showUnlockConfetti, setShowUnlockConfetti] = useState(false);

  const minSealOpenDate = useMemo(
    () => format(addDays(parseISO(today), 1), "yyyy-MM-dd"),
    [today],
  );

  useEffect(() => {
    setSealPickDate(minSealOpenDate);
  }, [minSealOpenDate]);

  useEffect(() => {
    if (!todayLetter || todayLetter.user_id !== userId) {
      setLetterBody("");
      return;
    }
    if (isLetterSealedBeforeOpenDate(todayLetter, today)) {
      setLetterBody("");
      return;
    }
    if (
      todayLetter.sealed === true &&
      openDay &&
      today >= openDay &&
      !revealedForLetter
    ) {
      setLetterBody("");
      return;
    }
    setLetterBody(todayLetter.body ?? "");
  }, [
    todayLetter,
    today,
    userId,
    openDay,
    revealedForLetter,
  ]);

  type SaveLetterOpts = {
    pinned: boolean;
    sealed?: boolean;
    openDate?: string | null;
    voidSeal?: boolean;
    bodyOverride?: string;
  };

  const saveLetter = useCallback(
    async (opts: SaveLetterOpts) => {
      if (!userId) return;
      setLetterSaving(true);
      setNotice(null);

      const voidSeal = opts.voidSeal === true;
      let sealed: boolean;
      let openDate: string | null;
      if (voidSeal) {
        sealed = false;
        openDate = null;
      } else if (opts.sealed === true) {
        sealed = true;
        openDate = opts.openDate ?? null;
      } else {
        sealed = todayLetter?.sealed === true;
        openDate = todayLetter?.open_date ?? null;
      }

      const rawBody = opts.bodyOverride ?? letterBody;
      if (!voidSeal && !rawBody.trim() && !sealed) {
        setNotice("Write something before saving.");
        setLetterSaving(false);
        return;
      }
      if (opts.sealed === true && !rawBody.trim()) {
        setNotice("Write your letter before sealing it.");
        setLetterSaving(false);
        return;
      }
      if (opts.sealed === true) {
        bodyBeforeSealRef.current = rawBody.slice(0, 50_000);
      }

      const now = new Date().toISOString();
      const row: MotivationLetterRow = {
        id: todayLetter?.id ?? crypto.randomUUID(),
        user_id: userId,
        letter_date: today,
        body: voidSeal
          ? (bodyBeforeSealRef.current ?? rawBody).slice(0, 50_000)
          : rawBody.slice(0, 50_000),
        pinned: opts.pinned,
        sealed,
        open_date: openDate,
        created_at: todayLetter?.created_at ?? now,
        updated_at: now,
      };

      const displayRow =
        sealed && openDate && today < openDate
          ? { ...row, body: "" }
          : row;

      const prev = bundle;
      const base: MotivationBundle = prev ?? {
        letters: [],
        voices: [],
        photos: [],
        prefs: null,
        updatedAt: Date.now(),
      };
      const next: MotivationBundle = {
        ...base,
        letters: upsertLetterInList(base.letters, displayRow),
        updatedAt: Date.now(),
      };
      setBundle(next);
      await saveMotivationBundleCached(next);

      const res = await upsertMotivationLetter(
        today,
        row.body,
        opts.pinned,
        sealed,
        openDate,
      );
      if (!res.ok) {
        if (opts.sealed === true) bodyBeforeSealRef.current = null;
        await enqueueMotivationOutbox(userId, {
          kind: "letter_upsert",
          letterDate: today,
          body: row.body,
          pinned: opts.pinned,
          sealed,
          openDate,
        });
        setNotice("Saved on this device — will sync when you're online.");
      } else {
        if (opts.sealed === true) {
          setSealUndoDeadline(Date.now() + 60_000);
          setShowSealPanel(false);
          setNotice("Letter sealed. You won't read it until the open date.");
        } else if (voidSeal) {
          bodyBeforeSealRef.current = null;
          setSealUndoDeadline(null);
          setLetterBody(row.body);
          setNotice("Seal removed — your letter is editable again.");
        } else {
          setNotice(opts.pinned ? "Letter saved and pinned." : "Letter saved.");
        }
        void refreshFromRemote();
      }
      setLetterSaving(false);
    },
    [userId, today, todayLetter, letterBody, bundle, refreshFromRemote],
  );

  const undoSeal = useCallback(() => {
    if (!sealUndoDeadline || Date.now() > sealUndoDeadline) return;
    void saveLetter({ pinned: todayLetter?.pinned ?? false, voidSeal: true });
  }, [sealUndoDeadline, saveLetter, todayLetter?.pinned]);

  const confirmSealLetter = useCallback(() => {
    if (!sealPickDate || sealPickDate < minSealOpenDate) {
      setNotice("Choose an open date at least one day from today.");
      return;
    }
    void saveLetter({
      pinned: todayLetter?.pinned ?? false,
      sealed: true,
      openDate: sealPickDate,
    });
  }, [sealPickDate, minSealOpenDate, saveLetter, todayLetter?.pinned]);

  const unlockSealedLetter = useCallback(() => {
    if (!userId || !todayLetter?.letter_date) return;
    setLetterRevealedInStorage(userId, todayLetter.letter_date);
    setLetterRevealedOverride(true);
    setLetterBody(todayLetter.body ?? "");
    setShowUnlockConfetti(true);
  }, [userId, todayLetter]);

  /** Voice tab state */
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordMimeRef = useRef<string>("audio/webm");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceTags, setVoiceTags] = useState<string[]>([]);
  const [voiceSaving, setVoiceSaving] = useState(false);

  const transcribeRecordedBlob = useCallback(async (blob: Blob) => {
    setTranscribing(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.set(
        "audio",
        new File([blob], "affirmation.webm", {
          type: blob.type || "audio/webm",
        }),
      );
      const res = await transcribeMotivationAudio(fd);
      if (res.ok) {
        setVoiceTranscript(res.text);
      } else {
        setNotice(surfaceErrorForUi(res.error));
      }
    } finally {
      setTranscribing(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    setNotice(null);
    setVoiceTranscript("");
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
    recordMimeRef.current = preferred;
    const mr = new MediaRecorder(stream, { mimeType: preferred });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    mr.start();
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.onstop = () => {
      mr.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, {
        type: recordMimeRef.current || "audio/webm",
      });
      void transcribeRecordedBlob(blob);
    };
    mr.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, [transcribeRecordedBlob]);

  const toggleVoiceTag = useCallback((t: string) => {
    setVoiceTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }, []);

  const saveVoice = useCallback(async () => {
    if (!userId || !voiceTranscript.trim()) {
      setNotice("Add a transcription before saving.");
      return;
    }
    setVoiceSaving(true);
    const id = crypto.randomUUID();
    const recordedAt = new Date().toISOString();
    const row: MotivationVoiceRow = {
      id,
      user_id: userId,
      transcript: voiceTranscript.trim().slice(0, 20_000),
      tags: voiceTags,
      audio_mime: null,
      audio_base64: null,
      recorded_at: recordedAt,
      created_at: recordedAt,
      updated_at: recordedAt,
    };
    const base = bundle ?? {
      letters: [],
      voices: [],
      photos: [],
      prefs: null,
      updatedAt: Date.now(),
    };
    const next: MotivationBundle = {
      ...base,
      voices: [row, ...base.voices],
      updatedAt: Date.now(),
    };
    setBundle(next);
    await saveMotivationBundleCached(next);

    const res = await createMotivationVoiceEntry({
      id,
      transcript: row.transcript,
      tags: row.tags,
      audioBase64: null,
      audioMime: null,
      recordedAt,
    });
    if (!res.ok) {
      await enqueueMotivationOutbox(userId, {
        kind: "voice_create",
        id,
        transcript: row.transcript,
        tags: row.tags,
        audioBase64: null,
        audioMime: null,
        recordedAt,
      });
      setNotice("Saved locally — will sync when online.");
    } else {
      setNotice("Voice affirmation saved.");
      setVoiceTranscript("");
      setVoiceTags([]);
      void refreshFromRemote();
    }
    setVoiceSaving(false);
  }, [userId, voiceTranscript, voiceTags, bundle, refreshFromRemote]);

  /** Vision */
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const addPhoto = useCallback(
    async (file: File) => {
      if (!userId || !isLikelyImageFile(file)) return;
      setPhotoBusy(true);
      try {
        const dataUrl = await compressImageFileToDataUrl(file, {
          maxWidth: 1280,
          quality: 0.82,
        });
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const photoDate = today;
        const row: MotivationPhotoRow = {
          id,
          user_id: userId,
          image_data_url: dataUrl,
          caption: null,
          photo_date: photoDate,
          is_wallpaper: false,
          created_at: now,
          updated_at: now,
        };
        const base = bundle ?? {
          letters: [],
          voices: [],
          photos: [],
          prefs: null,
          updatedAt: Date.now(),
        };
        const next: MotivationBundle = {
          ...base,
          photos: [row, ...base.photos],
          updatedAt: Date.now(),
        };
        setBundle(next);
        await saveMotivationBundleCached(next);
        const res = await createMotivationPhotoEntry({
          id,
          imageDataUrl: dataUrl,
          caption: null,
          photoDate,
          isWallpaper: false,
        });
        if (!res.ok) {
          await enqueueMotivationOutbox(userId, {
            kind: "photo_create",
            id,
            imageDataUrl: dataUrl,
            caption: null,
            photoDate,
            isWallpaper: false,
          });
          setNotice("Photo saved on device — sync pending.");
        } else {
          setNotice("Photo added to your vision board.");
          void refreshFromRemote();
        }
      } finally {
        setPhotoBusy(false);
      }
    },
    [userId, today, bundle, refreshFromRemote],
  );

  const setWallpaper = useCallback(
    async (photoId: string) => {
      if (!userId) return;
      const base = bundle ?? {
        letters: [],
        voices: [],
        photos: [],
        prefs: null,
        updatedAt: Date.now(),
      };
      const photos = base.photos.map((p) => ({
        ...p,
        is_wallpaper: p.id === photoId,
        updated_at: new Date().toISOString(),
      }));
      const prefs = {
        user_id: userId,
        wallpaper_photo_id: photoId,
        updated_at: new Date().toISOString(),
      };
      const next: MotivationBundle = {
        ...base,
        photos,
        prefs,
        updatedAt: Date.now(),
      };
      setBundle(next);
      await saveMotivationBundleCached(next);
      const res = await setMotivationWallpaperPhoto(photoId);
      if (!res.ok) {
        await enqueueMotivationOutbox(userId, {
          kind: "wallpaper_set",
          photoId,
        });
        setNotice("Wallpaper choice saved locally — will sync.");
      } else {
        setNotice("This photo is now your daily motivation backdrop on home.");
        void refreshFromRemote();
      }
    },
    [userId, bundle, refreshFromRemote],
  );

  /** Random message */
  const [randomPayload, setRandomPayload] = useState<
    | { type: "letter"; body: string; date: string }
    | { type: "voice"; transcript: string; date: string }
    | null
  >(null);

  const pullRandom = useCallback(() => {
    if (!userId) return;
    const letters = (bundle?.letters ?? []).filter((l) => {
      if (shouldExcludeLetterFromRandomPull(l, today, userId)) return false;
      return l.body.trim().length > 0;
    });
    const pinned = letters.filter((l) => l.pinned);
    const voices = (bundle?.voices ?? []).filter((v) => v.transcript.trim());
    type PoolItem =
      | { type: "letter"; body: string; date: string; w: number }
      | { type: "voice"; transcript: string; date: string; w: number };
    const pool: PoolItem[] = [];
    for (const l of pinned) {
      pool.push({
        type: "letter",
        body: l.body,
        date: l.letter_date,
        w: 3,
      });
    }
    for (const l of letters.filter((x) => !x.pinned)) {
      pool.push({ type: "letter", body: l.body, date: l.letter_date, w: 1 });
    }
    for (const v of voices) {
      pool.push({
        type: "voice",
        transcript: v.transcript,
        date: v.recorded_at.slice(0, 10),
        w: 2,
      });
    }
    if (pool.length === 0) {
      setRandomPayload(null);
      setNotice("No past messages yet — write or record something first.");
      return;
    }
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * total;
    for (const p of pool) {
      r -= p.w;
      if (r <= 0) {
        if (p.type === "letter") {
          setRandomPayload({
            type: "letter",
            body: p.body,
            date: p.date,
          });
        } else {
          setRandomPayload({
            type: "voice",
            transcript: p.transcript,
            date: p.date,
          });
        }
        setNotice(null);
        return;
      }
    }
  }, [bundle?.letters, bundle?.voices, today, userId]);

  /** Timeline + search */
  const [search, setSearch] = useState("");
  const timelineItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items: Array<{
      id: string;
      kind: "letter" | "voice" | "photo";
      title: string;
      subtitle: string;
      sort: string;
      monthKey: string;
      dateLabel: string;
    }> = [];
    for (const l of bundle?.letters ?? []) {
      const hideBody =
        !!userId && shouldHideLetterBodyInTimeline(l, today, userId);
      const hasLetter =
        l.body.trim().length > 0 ||
        (l.sealed === true && !!l.open_date);
      if (!hasLetter) continue;
      const dateLabel = format(
        parseISO(l.letter_date.slice(0, 10)),
        "MMM d, yyyy",
      );
      let subtitle: string;
      if (hideBody) {
        if (isLetterSealedBeforeOpenDate(l, today)) {
          const od = l.open_date?.slice(0, 10) ?? "";
          subtitle = `Sealed · Opens ${format(parseISO(od), "MMM d, yyyy")}`;
        } else {
          subtitle = "Sealed · Open in Letter tab to read";
        }
      } else {
        subtitle = l.body.slice(0, 160);
      }
      if (
        q &&
        !subtitle.toLowerCase().includes(q) &&
        !l.letter_date.toLowerCase().includes(q) &&
        !dateLabel.toLowerCase().includes(q) &&
        !(q.includes("seal") && l.sealed)
      )
        continue;
      const title =
        l.sealed === true
          ? l.pinned
            ? "Sealed · Pinned letter"
            : "Sealed letter"
          : l.pinned
            ? "Pinned letter"
            : "Letter";
      items.push({
        id: l.id,
        kind: "letter",
        title,
        subtitle,
        sort: l.updated_at,
        monthKey: format(parseISO(l.letter_date.slice(0, 10)), "MMMM yyyy"),
        dateLabel,
      });
    }
    for (const v of bundle?.voices ?? []) {
      const subtitle = v.transcript.slice(0, 160);
      const voiceDay = v.recorded_at.slice(0, 10);
      const dateLabel = format(parseISO(voiceDay), "MMM d, yyyy");
      if (
        q &&
        !subtitle.toLowerCase().includes(q) &&
        !v.tags.some((t) => t.toLowerCase().includes(q)) &&
        !voiceDay.toLowerCase().includes(q) &&
        !dateLabel.toLowerCase().includes(q)
      )
        continue;
      items.push({
        id: v.id,
        kind: "voice",
        title: `Voice · ${v.tags.join(", ") || "Affirmation"}`,
        subtitle,
        sort: v.recorded_at,
        monthKey: format(parseISO(voiceDay), "MMMM yyyy"),
        dateLabel,
      });
    }
    for (const p of bundle?.photos ?? []) {
      const photoDay = p.photo_date.slice(0, 10);
      const dateLabel = format(parseISO(photoDay), "MMM d, yyyy");
      const extra = [p.caption?.trim(), p.is_wallpaper ? "Wallpaper" : null]
        .filter(Boolean)
        .join(" · ");
      const subtitle = extra || "Vision photo";
      if (
        q &&
        !subtitle.toLowerCase().includes(q) &&
        !p.photo_date.toLowerCase().includes(q) &&
        !dateLabel.toLowerCase().includes(q)
      )
        continue;
      items.push({
        id: p.id,
        kind: "photo",
        title: "Vision photo",
        subtitle,
        sort: p.created_at,
        monthKey: format(parseISO(photoDay), "MMMM yyyy"),
        dateLabel,
      });
    }
    items.sort((a, b) => (a.sort < b.sort ? 1 : -1));
    return items;
  }, [bundle?.letters, bundle?.voices, bundle?.photos, search, today, userId]);

  const tabs: { id: TabId; label: string; Icon: typeof Heart }[] = [
    { id: "letter", label: "Letter to Future Self", Icon: Heart },
    { id: "voice", label: "Voice Affirmations", Icon: Mic },
    { id: "vision", label: "Vision Board", Icon: LayoutGrid },
    { id: "timeline", label: "Timeline", Icon: CalendarDays },
  ];

  if (!userId) {
    return (
      <div className="kal-glass-card rounded-2xl p-8 text-center text-kal-muted">
        Sign in to use Personal Motivation.
      </div>
    );
  }

  if (hydrating && !bundle) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-kal-muted">
        <Loader2 className="size-10 animate-spin text-kal-accent" />
        <p className="text-sm font-medium">Loading your motivation…</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl pb-16">
      <div
        className="pointer-events-none absolute -right-20 top-0 size-52 rounded-full bg-kal-accent/10 blur-3xl"
        aria-hidden
      />
      <header className="relative mb-8 text-center sm:text-left">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kal-accent">
          Inner game
        </p>
        <h1 className="kal-feature-title mt-2">Personal Motivation</h1>
        <p className="kal-feature-lead mx-auto mt-3 max-w-xl sm:mx-0">
          Your daily fuel · Messages to future self
        </p>
      </header>

      <div className="relative mb-8 overflow-hidden rounded-2xl border border-kal-accent/25 bg-gradient-to-br from-kal-accent-soft/80 to-kal-card px-5 py-6 kal-shadow-card sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
              Motivation streak
            </p>
            <p className="mt-1 text-base font-semibold text-kal-text sm:text-lg">
              {streak > 0 ? (
                <>
                  You&apos;ve written to yourself for{" "}
                  <span className="tabular-nums text-kal-accent">{streak}</span>{" "}
                  consecutive day{streak === 1 ? "" : "s"}{" "}
                  <span aria-hidden>🔥</span>
                </>
              ) : (
                <>Start today&apos;s letter to begin your streak 🔥</>
              )}
            </p>
            <p className="mt-1 text-xs text-kal-text-secondary sm:text-sm">
              One honest letter per day keeps the chain alive.
            </p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-kal-card text-kal-accent ring-1 ring-kal-border">
            <Flame className="size-7" strokeWidth={2} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={pullRandom}
        className="relative mb-8 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-kal-accent/35 bg-kal-card px-5 py-4 text-sm font-bold text-kal-accent shadow-sm transition-colors hover:bg-kal-accent-soft/60 active:scale-[0.99] sm:text-base"
      >
        <Sparkles className="size-5 shrink-0" />
        Pull a message from past me
      </button>

      {randomPayload ? (
        <div className="mb-8 rounded-2xl border border-kal-border bg-kal-card-muted/80 p-5 sm:px-7 sm:py-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
            From {randomPayload.date} ·{" "}
            {randomPayload.type === "letter" ? "Letter" : "Voice note"}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-kal-text sm:text-[15px]">
            {randomPayload.type === "letter"
              ? randomPayload.body
              : randomPayload.transcript}
          </p>
        </div>
      ) : null}

      {notice ? (
        <p className="mb-6 rounded-xl border border-kal-accent/20 bg-kal-accent-soft/50 px-4 py-3 text-sm text-kal-text-secondary">
          {notice}
        </p>
      ) : null}

      <div className="mb-6 flex flex-row gap-2 rounded-2xl border border-kal-border bg-kal-card-muted p-1.5">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-label={label}
            className={`flex min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-xl p-2 text-xs font-semibold transition-colors ${
              tab === id
                ? "bg-kal-card text-kal-accent shadow-sm ring-1 ring-kal-border"
                : "text-kal-muted hover:text-kal-text"
            }`}
          >
            <Icon className="size-4 shrink-0" strokeWidth={2} />
          </button>
        ))}
      </div>

      {tab === "letter" ? (
        <section className="relative space-y-5 kal-glass-card rounded-2xl px-5 py-6 sm:px-8 sm:py-8">
          {showUnlockConfetti ? (
            <ConfettiBurst onDone={() => setShowUnlockConfetti(false)} />
          ) : null}

          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-kal-text">Letter to Future Self</h2>
            <span className="text-xs font-medium tabular-nums text-kal-muted">
              {today}
            </span>
          </div>

          {sealedBeforeOpen ? (
            <>
              <p className="text-xs leading-relaxed text-kal-text-secondary sm:text-sm">
                This letter is sealed until the date you chose. The app won&apos;t show
                the text until then.
              </p>
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-kal-border bg-kal-page px-6 py-10 text-center">
                <Lock
                  className="size-12 text-kal-accent"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <p className="text-sm font-semibold text-kal-text">
                  Sealed on{" "}
                  {format(parseISO(todayLetter?.letter_date ?? today), "MMM d, yyyy")}
                </p>
                <p className="text-sm text-kal-text-secondary">
                  Opens on{" "}
                  {openDay
                    ? format(parseISO(openDay), "MMM d, yyyy")
                    : ""}
                </p>
                {openDay ? (
                  <p className="text-xs font-medium tabular-nums text-kal-muted">
                    {differenceInCalendarDays(parseISO(openDay), parseISO(today))}{" "}
                    day
                    {differenceInCalendarDays(parseISO(openDay), parseISO(today)) === 1
                      ? ""
                      : "s"}{" "}
                    to go
                  </p>
                ) : null}
                {sealUndoDeadline && Date.now() < sealUndoDeadline ? (
                  <button
                    type="button"
                    disabled={letterSaving}
                    onClick={() => void undoSeal()}
                    className="text-xs font-bold uppercase tracking-wide text-kal-accent underline-offset-2 hover:underline"
                  >
                    Undo seal (60s)
                  </button>
                ) : null}
              </div>
            </>
          ) : sealedReadyToOpen && !revealedForLetter ? (
            <>
              <p className="text-xs leading-relaxed text-kal-text-secondary sm:text-sm">
                You asked Past You to keep this private until today. When you&apos;re
                ready, open it.
              </p>
              <div className="relative overflow-hidden rounded-2xl border-2 border-kal-accent/35 bg-gradient-to-br from-kal-accent-soft/90 to-kal-card px-6 py-8 text-center">
                <p className="text-sm font-semibold text-kal-text">
                  A letter from{" "}
                  {format(parseISO(todayLetter?.letter_date ?? today), "MMM d, yyyy")}{" "}
                  is ready.
                </p>
                <button
                  type="button"
                  disabled={letterSaving}
                  onClick={() => void unlockSealedLetter()}
                  className="kal-btn-accent mt-5 min-h-[52px] w-full max-w-sm text-base"
                >
                  Open your letter
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-kal-text-secondary sm:text-sm">
                Write what you need your future self to remember — courage, patience,
                why this season matters. You can save as-is, pin for later, or{" "}
                <span className="font-semibold text-kal-text">seal</span> it so you
                can&apos;t read it until a date you pick.
              </p>
              <textarea
                value={letterBody}
                onChange={(e) => setLetterBody(e.target.value)}
                rows={14}
                placeholder="Dear future me…"
                disabled={letterSaving}
                className="min-h-[280px] w-full resize-y rounded-2xl border border-kal-border bg-kal-page p-4 text-base leading-relaxed text-kal-text placeholder:text-kal-muted/80 focus:border-kal-accent/50 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 disabled:opacity-60"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={letterSaving || !letterBody.trim()}
                  onClick={() => void saveLetter({ pinned: false })}
                  className="kal-btn-accent flex-1 min-h-[48px] disabled:opacity-50"
                >
                  {letterSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save letter
                </button>
                <button
                  type="button"
                  disabled={letterSaving || !letterBody.trim()}
                  onClick={() => void saveLetter({ pinned: true })}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-kal-accent/40 bg-kal-accent-soft/50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-kal-accent transition-colors hover:bg-kal-accent-soft disabled:opacity-50"
                >
                  <Pin className="size-4" />
                  Pin this letter
                </button>
              </div>

              {!showSealPanel ? (
                <button
                  type="button"
                  disabled={letterSaving || !letterBody.trim()}
                  onClick={() => {
                    setShowSealPanel(true);
                    setNotice(null);
                  }}
                  className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-card disabled:opacity-50"
                >
                  <Lock className="size-4 text-kal-accent" />
                  Seal for a future date
                </button>
              ) : (
                <div className="space-y-4 rounded-2xl border border-kal-accent/25 bg-kal-accent-soft/30 p-5">
                  <p className="text-sm font-semibold text-kal-text">
                    Choose when you&apos;re allowed to read this letter again
                  </p>
                  <label className="block text-xs font-bold uppercase tracking-wide text-kal-muted">
                    Open date
                    <input
                      type="date"
                      min={minSealOpenDate}
                      value={sealPickDate}
                      onChange={(e) => setSealPickDate(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-kal-border bg-kal-page px-3 py-2 text-base text-kal-text"
                    />
                  </label>
                  <p className="text-xs text-kal-text-secondary">
                    Until then, the letter stays hidden here and won&apos;t appear in
                    random pulls or the timeline preview.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={letterSaving || !letterBody.trim()}
                      onClick={() => void confirmSealLetter()}
                      className="kal-btn-accent min-h-[48px] flex-1"
                    >
                      <Lock className="size-4" />
                      Seal this letter
                    </button>
                    <button
                      type="button"
                      disabled={letterSaving}
                      onClick={() => setShowSealPanel(false)}
                      className="min-h-[48px] flex-1 rounded-xl border border-kal-border px-4 py-3 text-sm font-semibold text-kal-muted hover:text-kal-text"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      ) : null}

      {tab === "voice" ? (
        <section className="space-y-6 kal-glass-card rounded-2xl px-5 py-6 sm:px-8 sm:py-8">
          <h2 className="text-sm font-semibold text-kal-text">Voice Affirmations</h2>
          <p className="text-xs text-kal-text-secondary">
            Tap Record, then Stop — your words are transcribed automatically. Only
            the text is saved.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!recording ? (
              <button
                type="button"
                disabled={transcribing}
                onClick={() => void startRecording()}
                className="kal-btn-accent disabled:opacity-45"
              >
                <Mic className="size-4" />
                Record
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 rounded-xl border border-kal-accent/40 bg-kal-accent-soft px-4 py-3 text-xs font-bold uppercase tracking-wide text-kal-accent-dark dark:text-kal-accent"
              >
                <Square className="size-4 fill-current" />
                Stop
              </button>
            )}
            {transcribing ? (
              <span className="inline-flex items-center gap-2 text-xs font-medium text-kal-muted">
                <Loader2 className="size-4 animate-spin text-kal-accent" />
                Transcribing…
              </span>
            ) : null}
          </div>

          <div className="rounded-2xl border border-kal-border bg-kal-page p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
              Transcript
            </p>
            <textarea
              value={voiceTranscript}
              onChange={(e) => setVoiceTranscript(e.target.value)}
              rows={8}
              placeholder="Transcription appears after you stop recording — edit if needed."
              disabled={transcribing}
              className="mt-3 w-full resize-y rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted/80 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/15 disabled:opacity-60"
            />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
              Tags
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOTIVATION_VOICE_TAGS.map((t) => {
                const on = voiceTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleVoiceTag(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      on
                        ? "border-kal-accent bg-kal-accent-soft text-kal-accent-dark dark:text-kal-accent"
                        : "border-kal-border text-kal-muted hover:border-kal-accent/35"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={voiceSaving || transcribing || !voiceTranscript.trim()}
            onClick={() => void saveVoice()}
            className="kal-btn-accent w-full min-h-[48px]"
          >
            {voiceSaving ? "Saving…" : "Save affirmation"}
          </button>
        </section>
      ) : null}

      {tab === "vision" ? (
        <section className="space-y-6 kal-glass-card rounded-2xl px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-kal-text">Vision Board</h2>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void addPhoto(f);
              }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void addPhoto(f);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => cameraInputRef.current?.click()}
                className="kal-btn-accent"
              >
                {photoBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                Camera
              </button>
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => galleryInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-kal-border px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-kal-text"
              >
                <ImagePlus className="size-4" />
                Gallery
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(bundle?.photos ?? []).map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-kal-border bg-kal-card-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image_data_url}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
                <div className="space-y-2 p-2">
                  <p className="text-[10px] font-medium text-kal-muted">
                    {p.photo_date}
                  </p>
                  <button
                    type="button"
                    onClick={() => void setWallpaper(p.id)}
                    className="w-full rounded-lg border border-kal-accent/35 py-2 text-[10px] font-bold uppercase tracking-wide text-kal-accent hover:bg-kal-accent-soft/40"
                  >
                    Set as Daily Motivation Wallpaper
                  </button>
                </div>
              </div>
            ))}
          </div>
          {(bundle?.photos?.length ?? 0) === 0 ? (
            <p className="text-center text-sm text-kal-muted">
              Add photos that remind you what you&apos;re fighting for.
            </p>
          ) : null}
        </section>
      ) : null}

      {tab === "timeline" ? (
        <section className="kal-glass-card rounded-2xl px-5 py-6 sm:px-8 sm:py-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <h2 className="text-sm font-semibold text-kal-text">Timeline</h2>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-kal-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search letters, voice, photos…"
                className="w-full rounded-xl border border-kal-border bg-kal-page py-2.5 pl-9 pr-3 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/15"
              />
            </div>
          </div>
          <div className="relative pl-4 sm:pl-6">
            <div className="absolute bottom-0 left-[11px] top-0 w-px bg-kal-border sm:left-[15px]" />
            {(() => {
              let lastMonth = "";
              return timelineItems.map((item) => {
                const showMonth = item.monthKey !== lastMonth;
                lastMonth = item.monthKey;
                return (
                  <div key={item.id} className="relative pb-8 last:pb-0">
                    {showMonth ? (
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className="z-[1] size-2.5 shrink-0 rounded-full bg-kal-accent ring-4 ring-kal-card"
                          aria-hidden
                        />
                        <span className="text-xs font-bold uppercase tracking-wide text-kal-muted">
                          {item.monthKey}
                        </span>
                      </div>
                    ) : null}
                    <div className="ml-8 rounded-2xl border border-kal-border bg-kal-page px-4 py-3 sm:ml-10">
                      <p className="text-[11px] font-bold text-kal-accent">
                        {item.kind === "letter"
                          ? "Letter"
                          : item.kind === "voice"
                            ? "Voice"
                            : "Photo"}{" "}
                        · {item.title}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium tabular-nums text-kal-muted">
                        {item.dateLabel}
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm text-kal-text-secondary">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                );
              });
            })()}
            {timelineItems.length === 0 ? (
              <p className="text-sm text-kal-muted">
                No entries match your search yet.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
