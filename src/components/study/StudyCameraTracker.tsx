"use client";

import clsx from "clsx";
import { Camera, Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";

import { applyOptimisticStudySessionCreate } from "@/lib/studySessionMutations";
import {
  computeStudyFrameSignals,
  isFrameStudying,
  STUDY_TIMING_MS,
  type StudyDetectionSensitivity,
  type StudyStatusUi,
} from "@/lib/studyDetection";
import { useSettingsStore, type StudyCameraFacing } from "@/store/useSettingsStore";

/**
 * Face + Pose + Hand run 100% in-browser via MediaPipe Tasks Vision (WASM).
 * No frames or video are uploaded—only session metadata after you tap End.
 */
const WASM_VER = "0.10.34";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

type SessionPhase = "idle" | "running" | "paused";

type Props = {
  subject: string;
  userId: string;
  onDone: () => void;
};

export function StudyCameraTracker({ subject, userId, onDone }: Props) {
  const facing = useSettingsStore((s) => s.studyCameraFacing);
  const setFacing = useSettingsStore((s) => s.setStudyCameraFacing);
  const sensitivity = useSettingsStore(
    (s) => s.studyDetectionSensitivity,
  ) as StudyDetectionSensitivity;

  const webcamRef = useRef<Webcam | null>(null);
  const faceLmRef = useRef<import("@mediapipe/tasks-vision").FaceLandmarker | null>(
    null,
  );
  const poseLmRef = useRef<import("@mediapipe/tasks-vision").PoseLandmarker | null>(
    null,
  );
  const handLmRef = useRef<import("@mediapipe/tasks-vision").HandLandmarker | null>(
    null,
  );

  const prevNoseRef = useRef<{ x: number; y: number } | null>(null);
  const prevShoulderRef = useRef<{ x: number; y: number } | null>(null);
  const sessionStartedAtRef = useRef<string | null>(null);
  const sessionPhaseRef = useRef<SessionPhase>("idle");
  /** Only studying time counts toward the logged duration */
  const activeStudyMsRef = useRef(0);
  const idleGoodMsRef = useRef(0);
  const badMsRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  const [modelsReady, setModelsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [confidencePct, setConfidencePct] = useState(0);
  const [frameStatus, setFrameStatus] = useState<StudyStatusUi>("not_studying");
  const [autoPaused, setAutoPaused] = useState(false);
  const [gentleNotice, setGentleNotice] = useState(false);

  useEffect(() => {
    sessionPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { FaceLandmarker, PoseLandmarker, HandLandmarker, FilesetResolver } =
          await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(
          `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${WASM_VER}/wasm`,
        );

        const face = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: "CPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
        });

        let pose: import("@mediapipe/tasks-vision").PoseLandmarker | null = null;
        let hand: import("@mediapipe/tasks-vision").HandLandmarker | null = null;
        try {
          pose = await PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: POSE_MODEL, delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.35,
            minPosePresenceConfidence: 0.35,
            minTrackingConfidence: 0.3,
          });
        } catch {
          /* pose optional on very weak devices */
        }
        try {
          hand = await HandLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: HAND_MODEL, delegate: "CPU" },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.3,
          });
        } catch {
          /* hand optional */
        }

        if (cancelled) {
          face.close();
          pose?.close();
          hand?.close();
          return;
        }
        faceLmRef.current = face;
        poseLmRef.current = pose;
        handLmRef.current = hand;
        setModelsReady(true);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Could not load models.");
      }
    })();
    return () => {
      cancelled = true;
      faceLmRef.current?.close();
      poseLmRef.current?.close();
      handLmRef.current?.close();
      faceLmRef.current = null;
      poseLmRef.current = null;
      handLmRef.current = null;
    };
  }, []);

  const startSession = useCallback(() => {
    setAutoPaused(false);
    setGentleNotice(false);
    sessionStartedAtRef.current = new Date().toISOString();
    activeStudyMsRef.current = 0;
    setDisplaySeconds(0);
    idleGoodMsRef.current = 0;
    badMsRef.current = 0;
    lastTsRef.current = performance.now();
    sessionPhaseRef.current = "running";
    setPhase("running");
  }, []);

  const pauseSession = useCallback(() => {
    sessionPhaseRef.current = "paused";
    setPhase("paused");
  }, []);

  const resumeSession = useCallback(() => {
    setAutoPaused(false);
    setGentleNotice(false);
    badMsRef.current = 0;
    lastTsRef.current = performance.now();
    sessionPhaseRef.current = "running";
    setPhase("running");
  }, []);

  const endAndLog = useCallback(async () => {
    const started = sessionStartedAtRef.current;
    const durSec = Math.max(0, Math.floor(activeStudyMsRef.current / 1000));
    sessionPhaseRef.current = "idle";
    setPhase("idle");
    sessionStartedAtRef.current = null;
    activeStudyMsRef.current = 0;
    setDisplaySeconds(0);
    setAutoPaused(false);
    setGentleNotice(false);
    idleGoodMsRef.current = 0;
    badMsRef.current = 0;
    if (!started || durSec < 1) {
      onDone();
      return;
    }
    const ended = new Date().toISOString();
    await applyOptimisticStudySessionCreate({
      id: crypto.randomUUID(),
      user_id: userId,
      subject: subject.trim() || "Study session",
      duration_seconds: durSec,
      is_camera_proven: true,
      started_at: started,
      ended_at: ended,
    });
    onDone();
  }, [subject, userId, onDone]);

  useEffect(() => {
    if (!modelsReady || !videoReady) return;
    let raf = 0;
    let uiTick = 0;

    const loop = () => {
      const video = webcamRef.current?.video;
      const faceLm = faceLmRef.current;
      if (!video || video.readyState < 2 || !faceLm) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      const last = lastTsRef.current ?? now;
      const dt = Math.min(120, Math.max(0, now - last));
      lastTsRef.current = now;

      const ts = now;
      const faceRes = faceLm.detectForVideo(video, ts);
      const faceLmks = faceRes.faceLandmarks?.[0];

      const poseLm = poseLmRef.current;
      const poseRes = poseLm?.detectForVideo(video, ts);
      const poseLmks = poseRes?.landmarks?.[0];

      const handLm = handLmRef.current;
      const handRes = handLm?.detectForVideo(video, ts);
      const handLmks = handRes?.landmarks;

      const signals = computeStudyFrameSignals(
        { landmarks: faceLmks, prevNose: prevNoseRef.current },
        { landmarks: poseLmks, prevShoulderMid: prevShoulderRef.current },
        { landmarks: handLmks },
        sensitivity,
      );
      prevNoseRef.current = signals.nextNose;
      prevShoulderRef.current = signals.nextShoulderMid;

      const studyingNow = isFrameStudying(signals.confidencePct, sensitivity);
      const ph = sessionPhaseRef.current;

      uiTick += 1;
      if (uiTick % 3 === 0) {
        setConfidencePct(signals.confidencePct);
        setFrameStatus(signals.status);
      }

      if (ph === "idle") {
        if (studyingNow) {
          idleGoodMsRef.current += dt;
          if (idleGoodMsRef.current >= STUDY_TIMING_MS.idleAutoStart) {
            idleGoodMsRef.current = 0;
            startSession();
          }
        } else {
          idleGoodMsRef.current = 0;
        }
      } else if (ph === "running") {
        if (studyingNow) {
          activeStudyMsRef.current += dt;
          badMsRef.current = 0;
          const sec = Math.floor(activeStudyMsRef.current / 1000);
          setDisplaySeconds(sec);
        } else {
          badMsRef.current += dt;
          if (badMsRef.current >= STUDY_TIMING_MS.runningAutoPause) {
            setPhase("paused");
            setAutoPaused(true);
            setGentleNotice(true);
            badMsRef.current = 0;
            lastTsRef.current = now;
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [modelsReady, videoReady, sensitivity, startSession]);

  const subj = subject.trim() || "Study session";

  const statusLabel = (() => {
    if (phase === "paused" && autoPaused) {
      return {
        text: "Paused – Not studying",
        sub: "Are you still studying?",
        tone: "red" as const,
      };
    }
    if (phase === "running") {
      if (frameStatus === "studying") {
        return {
          text: "Studying detected",
          sub: `${confidencePct}% confidence`,
          tone: "green" as const,
        };
      }
      if (frameStatus === "unfocused") {
        return {
          text: "Sitting but not focused",
          sub: `${confidencePct}% · look at your book`,
          tone: "yellow" as const,
        };
      }
      return {
        text: "Not studying",
        sub: `${confidencePct}% · settle in to continue`,
        tone: "red" as const,
      };
    }
    return {
      text: "Ready",
      sub: "Face + pose + hands (on-device)",
      tone: "neutral" as const,
    };
  })();

  return (
    <div className="flex min-h-[min(100dvh,44rem)] flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="min-w-0 flex-1 space-y-3">
          <div
            className={clsx(
              "rounded-2xl border px-4 py-3",
              statusLabel.tone === "green" &&
                "border-emerald-500/40 bg-emerald-950/35",
              statusLabel.tone === "yellow" &&
                "border-amber-500/40 bg-amber-950/30",
              statusLabel.tone === "red" && "border-rose-500/40 bg-rose-950/30",
              statusLabel.tone === "neutral" &&
                "border-white/[0.08] bg-slate-950/50",
            )}
          >
            <p className="text-sm font-bold text-white">{statusLabel.text}</p>
            <p className="mt-1 text-xs text-zinc-400">{statusLabel.sub}</p>
          </div>

          {gentleNotice && phase === "paused" ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-xs text-amber-100/90">
              We paused the timer because we couldn&apos;t see a steady studying
              signal. Tap Resume when you&apos;re back.
            </p>
          ) : null}

          <div className="text-center sm:text-left">
            <p
              className={clsx(
                "font-mono text-5xl font-bold tabular-nums tracking-tight sm:text-6xl",
                phase === "running" ? "text-white" : "text-zinc-500",
              )}
            >
              {formatClock(phase === "idle" ? 0 : displaySeconds)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Studying time only — pauses when you look away
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[200px] shrink-0 sm:mx-0 sm:w-44">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black ring-2 ring-white/5">
            <Webcam
              ref={webcamRef}
              audio={false}
              mirrored={facing === "user"}
              videoConstraints={{
                facingMode: facing,
                width: { ideal: 480 },
                height: { ideal: 360 },
              }}
              onUserMedia={() => setVideoReady(true)}
              className="h-full w-full object-cover"
            />
            <div className="absolute right-1 bottom-1 max-w-[95%] rounded-md bg-black/80 px-1.5 py-1 text-[8px] font-medium leading-tight text-emerald-100/95 ring-1 ring-white/10">
              🔒 On-device only · Private
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] leading-snug text-zinc-500 sm:text-left">
            Live preview stays on your phone. Everything processed on your phone
            only.
          </p>
        </div>
      </div>

      {loadError ? (
        <p className="text-xs text-rose-300">{loadError}</p>
      ) : !modelsReady ? (
        <p className="text-xs text-zinc-500">
          Loading face, pose, and hand models (on-device)…
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
        <p className="truncate text-xs text-zinc-500">
          <span className="text-zinc-400">{subj}</span>
        </p>
        <div className="flex items-center gap-2">
          <Camera className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
          <select
            value={facing}
            onChange={(e) =>
              setFacing(e.target.value as StudyCameraFacing)
            }
            className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-white"
            aria-label="Camera"
          >
            <option value="user">Front</option>
            <option value="environment">Back</option>
          </select>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap justify-center gap-2 pb-1">
        {phase === "idle" ? (
          <button
            type="button"
            onClick={startSession}
            disabled={!modelsReady}
            className="inline-flex min-h-[52px] min-w-[10rem] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-base font-semibold text-white disabled:opacity-40"
          >
            <Play className="h-5 w-5" />
            Start session
          </button>
        ) : null}
        {phase === "idle" ? (
          <p className="w-full text-center text-[11px] text-zinc-500">
            Or keep reading — we&apos;ll start automatically after{" "}
            {Math.round(STUDY_TIMING_MS.idleAutoStart / 1000)}s of studying
            detected.
          </p>
        ) : null}

        {phase === "running" ? (
          <button
            type="button"
            onClick={pauseSession}
            className="inline-flex min-h-[52px] min-w-[8rem] items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-base font-semibold text-amber-950"
          >
            <Pause className="h-5 w-5" />
            Pause
          </button>
        ) : null}

        {phase === "paused" ? (
          <button
            type="button"
            onClick={resumeSession}
            className="inline-flex min-h-[52px] min-w-[8rem] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-base font-semibold text-white"
          >
            <Play className="h-5 w-5" />
            Resume
          </button>
        ) : null}

        {phase !== "idle" ? (
          <button
            type="button"
            onClick={() => void endAndLog()}
            className="inline-flex min-h-[52px] min-w-[8rem] items-center justify-center gap-2 rounded-2xl border-2 border-rose-500/50 bg-rose-950/50 px-5 text-base font-semibold text-rose-100"
          >
            <Square className="h-5 w-5" />
            End session
          </button>
        ) : null}
      </div>
    </div>
  );
}
