"use client";

import { addDays, format, parseISO } from "date-fns";
import {
  CalendarDays,
  Camera,
  Check,
  Flame,
  Heart,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Mic,
  Pause,
  Pin,
  Play,
  Search,
  Sparkles,
  Square,
  Volume2,
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
import { flushMotivationOutbox } from "@/lib/motivationSync";
import { useAuthStore } from "@/store/useAuthStore";

type TabId = "letter" | "voice" | "vision" | "timeline";

function letterStreakDays(
  letters: MotivationLetterRow[],
  today: string,
): number {
  const withLetter = new Set<string>();
  for (const l of letters) {
    if (l.body.trim().length > 0) withLetter.add(l.letter_date);
  }
  let n = 0;
  let d = today;
  while (withLetter.has(d)) {
    n++;
    d = format(addDays(parseISO(d), -1), "yyyy-MM-dd");
  }
  return n;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = String(r.result ?? "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(blob);
  });
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
        letters: fresh.letters,
        voices: fresh.voices,
        photos: fresh.photos,
        prefs: fresh.prefs,
      });
      await saveMotivationBundleCached(merged);
      setBundle(merged);
    }
  }, [userId]);

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
        if (!cancelled && cached) setBundle(cached);
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
  }, [userId, refreshFromRemote]);

  const todayLetter = useMemo(
    () =>
      bundle?.letters.find(
        (l) => l.letter_date === today && l.user_id === userId,
      ),
    [bundle?.letters, today, userId],
  );

  const [letterBody, setLetterBody] = useState("");
  const [letterSaving, setLetterSaving] = useState(false);

  useEffect(() => {
    setLetterBody(todayLetter?.body ?? "");
  }, [todayLetter?.body, today]);

  const saveLetter = useCallback(
    async (pinned: boolean) => {
      if (!userId) return;
      setLetterSaving(true);
      setNotice(null);
      const now = new Date().toISOString();
      const row: MotivationLetterRow = {
        id: todayLetter?.id ?? crypto.randomUUID(),
        user_id: userId,
        letter_date: today,
        body: letterBody.slice(0, 50_000),
        pinned,
        created_at: todayLetter?.created_at ?? now,
        updated_at: now,
      };
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
        letters: upsertLetterInList(base.letters, row),
        updatedAt: Date.now(),
      };
      setBundle(next);
      await saveMotivationBundleCached(next);

      const res = await upsertMotivationLetter(today, row.body, pinned);
      if (!res.ok) {
        await enqueueMotivationOutbox(userId, {
          kind: "letter_upsert",
          letterDate: today,
          body: row.body,
          pinned,
        });
        setNotice("Saved on this device — will sync when you're online.");
      } else {
        setNotice(pinned ? "Letter saved and pinned." : "Letter saved.");
        void refreshFromRemote();
      }
      setLetterSaving(false);
    },
    [userId, today, todayLetter, letterBody, bundle, refreshFromRemote],
  );

  /** Voice tab state */
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordMimeRef = useRef<string>("audio/webm");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceTags, setVoiceTags] = useState<string[]>([]);
  const [voiceSaving, setVoiceSaving] = useState(false);
  const audioUrlRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    setNotice(null);
    setRecordedBlob(null);
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
      setRecordedBlob(blob);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
    };
    mr.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const runTranscribe = useCallback(async () => {
    if (!recordedBlob) return;
    setTranscribing(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.set(
        "audio",
        new File([recordedBlob], "affirmation.webm", {
          type: recordedBlob.type || "audio/webm",
        }),
      );
      const res = await transcribeMotivationAudio(fd);
      if (res.ok) setVoiceTranscript(res.text);
      else setNotice(res.error);
    } finally {
      setTranscribing(false);
    }
  }, [recordedBlob]);

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
    let audioBase64: string | null = null;
    if (recordedBlob && recordedBlob.size < 1_200_000) {
      try {
        audioBase64 = await blobToBase64(recordedBlob);
      } catch {
        audioBase64 = null;
      }
    }
    const row: MotivationVoiceRow = {
      id,
      user_id: userId,
      transcript: voiceTranscript.trim().slice(0, 20_000),
      tags: voiceTags,
      audio_mime: recordedBlob?.type ?? "audio/webm",
      audio_base64: audioBase64,
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
      audioBase64,
      audioMime: row.audio_mime,
      recordedAt,
    });
    if (!res.ok) {
      await enqueueMotivationOutbox(userId, {
        kind: "voice_create",
        id,
        transcript: row.transcript,
        tags: row.tags,
        audioBase64,
        audioMime: row.audio_mime,
        recordedAt,
      });
      setNotice("Saved locally — will sync when online.");
    } else {
      setNotice("Voice affirmation saved.");
      setRecordedBlob(null);
      setVoiceTranscript("");
      setVoiceTags([]);
      void refreshFromRemote();
    }
    setVoiceSaving(false);
  }, [
    userId,
    voiceTranscript,
    voiceTags,
    recordedBlob,
    bundle,
    refreshFromRemote,
  ]);

  const togglePlay = useCallback(() => {
    const url = audioUrlRef.current;
    if (!url) return;
    let el = audioElRef.current;
    if (!el) {
      el = new Audio(url);
      audioElRef.current = el;
      el.onended = () => setPlaying(false);
    }
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play();
      setPlaying(true);
    }
  }, [playing]);

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
    const letters = (bundle?.letters ?? []).filter((l) => l.body.trim());
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
  }, [bundle?.letters, bundle?.voices]);

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
    }> = [];
    for (const l of bundle?.letters ?? []) {
      if (!l.body.trim()) continue;
      const subtitle = l.body.slice(0, 160);
      if (q && !subtitle.toLowerCase().includes(q) && !l.letter_date.includes(q))
        continue;
      items.push({
        id: l.id,
        kind: "letter",
        title: l.pinned ? "Pinned letter" : "Letter",
        subtitle,
        sort: l.updated_at,
        monthKey: format(parseISO(l.letter_date.slice(0, 10)), "MMMM yyyy"),
      });
    }
    for (const v of bundle?.voices ?? []) {
      const subtitle = v.transcript.slice(0, 160);
      if (
        q &&
        !subtitle.toLowerCase().includes(q) &&
        !v.tags.some((t) => t.toLowerCase().includes(q))
      )
        continue;
      items.push({
        id: v.id,
        kind: "voice",
        title: `Voice · ${v.tags.join(", ") || "Affirmation"}`,
        subtitle,
        sort: v.recorded_at,
        monthKey: format(parseISO(v.recorded_at.slice(0, 10)), "MMMM yyyy"),
      });
    }
    for (const p of bundle?.photos ?? []) {
      if (q && !(p.caption ?? "").toLowerCase().includes(q) && !p.photo_date.includes(q))
        continue;
      items.push({
        id: p.id,
        kind: "photo",
        title: "Vision photo",
        subtitle: p.photo_date + (p.is_wallpaper ? " · Wallpaper" : ""),
        sort: p.created_at,
        monthKey: format(parseISO(p.photo_date.slice(0, 10)), "MMMM yyyy"),
      });
    }
    items.sort((a, b) => (a.sort < b.sort ? 1 : -1));
    return items;
  }, [bundle?.letters, bundle?.voices, bundle?.photos, search]);

  const tabs: { id: TabId; label: string; Icon: typeof Heart }[] = [
    { id: "letter", label: "Letter to Future Self", Icon: Heart },
    { id: "voice", label: "Voice Affirmations", Icon: Mic },
    { id: "vision", label: "Vision Board", Icon: LayoutGrid },
    { id: "timeline", label: "Timeline", Icon: CalendarDays },
  ];

  if (!userId) {
    return (
      <div className="rounded-2xl border border-kal-border bg-kal-card p-8 text-center text-kal-muted">
        Sign in to use Personal Motivation.
      </div>
    );
  }

  if (hydrating && !bundle) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-kal-muted">
        <Loader2 className="h-10 w-10 animate-spin text-kal-accent" />
        <p className="text-sm font-medium">Loading your motivation…</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl pb-16">
      <div
        className="pointer-events-none absolute -right-20 top-0 h-52 w-52 rounded-full bg-kal-accent/10 blur-3xl"
        aria-hidden
      />
      <header className="relative mb-8 text-center sm:text-left">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kal-accent">
          Inner game
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-kal-text sm:text-4xl">
          Personal Motivation
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-kal-muted sm:mx-0 sm:text-base">
          Your daily fuel · Messages to future self
        </p>
      </header>

      <div className="relative mb-8 overflow-hidden rounded-2xl border border-kal-accent/25 bg-gradient-to-br from-kal-accent-soft/80 to-kal-card px-5 py-6 kal-shadow-card sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
              Motivation streak
            </p>
            <p className="mt-1 text-lg font-bold text-kal-text sm:text-xl">
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
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kal-card text-kal-accent ring-1 ring-kal-border">
            <Flame className="h-7 w-7" strokeWidth={2} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={pullRandom}
        className="relative mb-8 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-kal-accent/35 bg-kal-card px-5 py-4 text-sm font-bold text-kal-accent shadow-sm transition-colors hover:bg-kal-accent-soft/60 active:scale-[0.99] sm:text-base"
      >
        <Sparkles className="h-5 w-5 shrink-0" />
        Pull a message from past me
      </button>

      {randomPayload ? (
        <div className="mb-8 rounded-2xl border border-kal-border bg-kal-card-muted/80 px-5 py-5 sm:px-7 sm:py-6">
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
            className={`flex min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
              tab === id
                ? "bg-kal-card text-kal-accent shadow-sm ring-1 ring-kal-border"
                : "text-kal-muted hover:text-kal-text"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
          </button>
        ))}
      </div>

      {tab === "letter" ? (
        <section className="space-y-5 rounded-2xl border border-kal-border bg-kal-card px-5 py-6 kal-shadow-card sm:px-8 sm:py-8">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-kal-text">Letter to Future Self</h2>
            <span className="text-xs font-medium tabular-nums text-kal-muted">
              {today}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-kal-text-secondary sm:text-sm">
            Write what you need your future self to remember — courage, patience,
            why this season matters.
          </p>
          <textarea
            value={letterBody}
            onChange={(e) => setLetterBody(e.target.value)}
            rows={14}
            placeholder="Dear future me…"
            className="min-h-[280px] w-full resize-y rounded-2xl border border-kal-border bg-kal-page px-4 py-4 text-[15px] leading-relaxed text-kal-text placeholder:text-kal-muted/80 focus:border-kal-accent/50 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={letterSaving}
              onClick={() => void saveLetter(false)}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-kal-accent px-5 py-3 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground shadow-sm transition-colors hover:bg-kal-accent-hover disabled:opacity-50"
            >
              {letterSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save letter
            </button>
            <button
              type="button"
              disabled={letterSaving}
              onClick={() => void saveLetter(true)}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-kal-accent/40 bg-kal-accent-soft/50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-kal-accent transition-colors hover:bg-kal-accent-soft disabled:opacity-50"
            >
              <Pin className="h-4 w-4" />
              Pin this letter
            </button>
          </div>
        </section>
      ) : null}

      {tab === "voice" ? (
        <section className="space-y-6 rounded-2xl border border-kal-border bg-kal-card px-5 py-6 kal-shadow-card sm:px-8 sm:py-8">
          <h2 className="text-sm font-bold text-kal-text">Voice Affirmations</h2>
          <p className="text-xs leading-relaxed text-kal-text-secondary sm:text-sm">
            Record a note — we transcribe with Groq — then tag it. Playback stays
            on your device until it syncs.
          </p>
          <div className="flex flex-wrap gap-2">
            {!recording ? (
              <button
                type="button"
                onClick={() => void startRecording()}
                className="inline-flex items-center gap-2 rounded-xl bg-kal-accent px-4 py-3 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground"
              >
                <Mic className="h-4 w-4" />
                Record
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 rounded-xl border border-red-300/80 bg-red-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-red-700 dark:bg-red-950/40 dark:text-red-200"
              >
                <Square className="h-4 w-4 fill-current" />
                Stop
              </button>
            )}
            <button
              type="button"
              disabled={!recordedBlob || transcribing}
              onClick={() => void runTranscribe()}
              className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-xs font-bold uppercase tracking-wide text-kal-text disabled:opacity-45"
            >
              {transcribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              Transcribe
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-kal-border bg-kal-page p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                Original voice
              </p>
              {recordedBlob ? (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-kal-accent/30 px-4 py-2 text-sm font-semibold text-kal-accent"
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {playing ? "Pause" : "Play"}
                </button>
              ) : (
                <p className="mt-3 text-sm text-kal-muted">Record to hear playback</p>
              )}
            </div>
            <div className="rounded-2xl border border-kal-border bg-kal-page p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                Transcript
              </p>
              <textarea
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                rows={6}
                placeholder="Transcription appears here — edit if needed."
                className="mt-3 w-full resize-y rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/15"
              />
            </div>
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
            disabled={voiceSaving || !voiceTranscript.trim()}
            onClick={() => void saveVoice()}
            className="w-full min-h-[48px] rounded-xl bg-kal-accent py-3 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground disabled:opacity-45"
          >
            {voiceSaving ? "Saving…" : "Save affirmation"}
          </button>
        </section>
      ) : null}

      {tab === "vision" ? (
        <section className="space-y-6 rounded-2xl border border-kal-border bg-kal-card px-5 py-6 kal-shadow-card sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-kal-text">Vision Board</h2>
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
                className="inline-flex items-center gap-2 rounded-xl bg-kal-accent px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground disabled:opacity-50"
              >
                {photoBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Camera
              </button>
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => galleryInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-kal-border px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-kal-text"
              >
                <ImagePlus className="h-4 w-4" />
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
        <section className="rounded-2xl border border-kal-border bg-kal-card px-5 py-6 kal-shadow-card sm:px-8 sm:py-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <h2 className="text-sm font-bold text-kal-text">Timeline</h2>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kal-muted" />
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
                          className="z-[1] h-2.5 w-2.5 shrink-0 rounded-full bg-kal-accent ring-4 ring-kal-card"
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
