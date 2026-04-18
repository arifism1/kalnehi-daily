"use client";

import clsx from "clsx";
import { Check, Info, Pause, Play, RefreshCw, Square } from "lucide-react";
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
import { USER_ERROR } from "@/lib/userFacingErrors";

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

const CONFIDENCE_SMOOTH_FRAMES = 24; // ~0.8 s at 30 fps
const OVERRIDE_DURATION_MS = 30_000;

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

// ---------------------------------------------------------------------------
// Skeleton drawing — pure canvas utility, no React, called from rAF loop
// ---------------------------------------------------------------------------

type NL = import("@mediapipe/tasks-vision").NormalizedLandmark;

// [fromIdx, toIdx, strokeStyle, lineWidth]
const POSE_LINKS: [number, number, string, number][] = [
  [11, 12, "rgba(255,255,255,0.55)", 2],   // shoulder bar
  [0, 11, "rgba(255,255,255,0.38)", 1.5],  // nose → left shoulder
  [0, 12, "rgba(255,255,255,0.38)", 1.5],  // nose → right shoulder
  [11, 13, "rgba(90,210,255,0.65)", 2],    // left upper arm
  [13, 15, "rgba(90,210,255,0.65)", 2],    // left forearm
  [12, 14, "rgba(90,210,255,0.65)", 2],    // right upper arm
  [14, 16, "rgba(90,210,255,0.65)", 2],    // right forearm
];

// [landmarkIdx, dotRadius, fillStyle]
const JOINT_CFG: [number, number, string][] = [
  [0, 4, "rgba(255,210,60,0.92)"],         // nose
  [11, 5, "rgba(255,255,255,0.88)"],       // left shoulder
  [12, 5, "rgba(255,255,255,0.88)"],       // right shoulder
  [13, 4, "rgba(90,210,255,0.88)"],        // left elbow
  [14, 4, "rgba(90,210,255,0.88)"],        // right elbow
  [15, 5, "rgba(80,255,180,0.95)"],        // left wrist
  [16, 5, "rgba(80,255,180,0.95)"],        // right wrist
];

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const HAND_TIPS = [4, 8, 12, 16, 20];

function drawSkeleton(
  canvas: HTMLCanvasElement,
  poseLmks: NL[] | undefined,
  faceLmks: NL[] | undefined,
  handLmks: NL[][] | undefined,
  mirrored: boolean,
): void {
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (!cw || !ch) return;
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, cw, ch);

  const px = (lm: NL) => (mirrored ? 1 - lm.x : lm.x) * cw;
  const py = (lm: NL) => lm.y * ch;
  const visible = (lm: NL) => (lm.visibility ?? 1) >= 0.4;

  // Pose skeleton
  if (poseLmks && poseLmks.length >= 17) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const [a, b, color, width] of POSE_LINKS) {
      const la = poseLmks[a];
      const lb = poseLmks[b];
      if (!la || !lb || !visible(la) || !visible(lb)) continue;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.moveTo(px(la), py(la));
      ctx.lineTo(px(lb), py(lb));
      ctx.stroke();
    }

    for (const [idx, r, fill] of JOINT_CFG) {
      const lm = poseLmks[idx];
      if (!lm || !visible(lm)) continue;
      // Shadow ring
      ctx.beginPath();
      ctx.arc(px(lm), py(lm), r + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      ctx.fill();
      // Coloured dot
      ctx.beginPath();
      ctx.arc(px(lm), py(lm), r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  // Face key points: nose + eyes
  if (faceLmks && faceLmks.length >= 264) {
    const FP: [number, number, string][] = [
      [1, 2.5, "rgba(255,210,60,0.80)"],   // nose tip
      [33, 2, "rgba(255,255,255,0.55)"],   // left eye outer
      [263, 2, "rgba(255,255,255,0.55)"],  // right eye outer
    ];
    for (const [idx, r, fill] of FP) {
      const lm = faceLmks[idx];
      if (!lm) continue;
      ctx.beginPath();
      ctx.arc(px(lm), py(lm), r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  // Hand skeleton
  if (handLmks) {
    for (const h of handLmks) {
      if (!h || h.length < 21) continue;

      ctx.lineCap = "round";
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(80,255,180,0.40)";
      for (const [a, b] of HAND_CONNECTIONS) {
        const la = h[a];
        const lb = h[b];
        if (!la || !lb) continue;
        ctx.beginPath();
        ctx.moveTo(px(la), py(la));
        ctx.lineTo(px(lb), py(lb));
        ctx.stroke();
      }

      // Wrist — prominent dot + halo
      const wrist = h[0];
      if (wrist) {
        ctx.beginPath();
        ctx.arc(px(wrist), py(wrist), 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(80,255,180,0.12)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px(wrist), py(wrist), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(80,255,180,0.85)";
        ctx.fill();
      }

      // Finger tips
      for (const tipIdx of HAND_TIPS) {
        const t = h[tipIdx];
        if (!t) continue;
        ctx.beginPath();
        ctx.arc(px(t), py(t), 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(80,255,180,0.70)";
        ctx.fill();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceLmRef = useRef<import("@mediapipe/tasks-vision").FaceLandmarker | null>(null);
  const poseLmRef = useRef<import("@mediapipe/tasks-vision").PoseLandmarker | null>(null);
  const handLmRef = useRef<import("@mediapipe/tasks-vision").HandLandmarker | null>(null);

  const prevNoseRef = useRef<{ x: number; y: number } | null>(null);
  const prevShoulderRef = useRef<{ x: number; y: number } | null>(null);
  const sessionStartedAtRef = useRef<string | null>(null);
  const sessionPhaseRef = useRef<SessionPhase>("idle");
  /** Only studying time (as detected) counts toward the logged duration */
  const activeStudyMsRef = useRef(0);
  const idleGoodMsRef = useRef(0);
  const badMsRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const confidenceBufferRef = useRef<number[]>([]);
  const overrideEndRef = useRef<number>(0);
  const overrideTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Mirrored ref so the rAF loop reads the latest value without re-creating the effect */
  const facingRef = useRef(facing);

  useEffect(() => {
    facingRef.current = facing;
  }, [facing]);

  const [modelsReady, setModelsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [smoothedConfidence, setSmoothedConfidence] = useState(0);
  const [subScores, setSubScores] = useState({ head: 0, gaze: 50, body: 0, hands: 35 });
  const [frameStatus, setFrameStatus] = useState<StudyStatusUi>("not_studying");
  const [autoPaused, setAutoPaused] = useState(false);
  const [gentleNotice, setGentleNotice] = useState(false);
  const [overrideSecondsLeft, setOverrideSecondsLeft] = useState(0);

  // MediaPipe / TFLite routes informational messages (e.g. "INFO: Created
  // TensorFlow Lite XNNPACK delegate for CPU.") through console.error, which
  // Next.js dev overlay then flags as errors. Suppress those INFO lines only
  // while this component is mounted.
  useEffect(() => {
    const orig = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].startsWith("INFO:")) return;
      orig(...args);
    };
    return () => {
      console.error = orig;
    };
  }, []);

  useEffect(() => {
    sessionPhaseRef.current = phase;
  }, [phase]);

  // Model loading
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
      } catch {
        setLoadError(USER_ERROR.loadFailed);
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
      if (overrideTickRef.current) {
        clearInterval(overrideTickRef.current);
        overrideTickRef.current = null;
      }
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

  /** Manual override: mark "I'm studying" for 30 s, suppressing auto-pause. */
  const triggerOverride = useCallback(() => {
    overrideEndRef.current = Date.now() + OVERRIDE_DURATION_MS;
    setOverrideSecondsLeft(Math.ceil(OVERRIDE_DURATION_MS / 1000));
    if (overrideTickRef.current) clearInterval(overrideTickRef.current);
    overrideTickRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((overrideEndRef.current - Date.now()) / 1000));
      setOverrideSecondsLeft(left);
      if (left === 0 && overrideTickRef.current) {
        clearInterval(overrideTickRef.current);
        overrideTickRef.current = null;
      }
    }, 1_000);
    if (sessionPhaseRef.current === "idle") startSession();
    else if (sessionPhaseRef.current === "paused") resumeSession();
  }, [startSession, resumeSession]);

  const endAndLog = useCallback(async () => {
    const started = sessionStartedAtRef.current;
    const durSec = Math.max(0, Math.floor(activeStudyMsRef.current / 1000));

    const resetSessionUi = () => {
      sessionPhaseRef.current = "idle";
      setPhase("idle");
      sessionStartedAtRef.current = null;
      activeStudyMsRef.current = 0;
      setDisplaySeconds(0);
      setAutoPaused(false);
      setGentleNotice(false);
      idleGoodMsRef.current = 0;
      badMsRef.current = 0;
    };

    if (!started || durSec < 1) {
      resetSessionUi();
      onDone();
      return;
    }

    resetSessionUi();
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

  // Main detection + drawing loop
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

      // Draw skeleton overlay onto the canvas
      const canvas = canvasRef.current;
      if (canvas) {
        drawSkeleton(
          canvas,
          poseLmks,
          faceLmks,
          handLmks,
          facingRef.current === "user",
        );
      }

      // Smooth confidence with a rolling buffer
      const buf = confidenceBufferRef.current;
      buf.push(signals.confidencePct);
      if (buf.length > CONFIDENCE_SMOOTH_FRAMES) buf.shift();
      const smoothed = Math.round(buf.reduce((a, b) => a + b, 0) / buf.length);

      const isOverriding = Date.now() < overrideEndRef.current;
      const studyingNow = isFrameStudying(signals.confidencePct, sensitivity) || isOverriding;

      const ph = sessionPhaseRef.current;

      uiTick += 1;
      if (uiTick % 3 === 0) {
        setSmoothedConfidence(smoothed);
        setSubScores({
          head: Math.round(signals.faceHeadDown * 100),
          gaze: Math.round(signals.gazeDown * 100),
          body: Math.round(signals.bodyStable * 100),
          hands: Math.round(signals.handsDesk * 100),
        });
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

  // Semantic colour based on smoothed confidence
  const confTone =
    smoothedConfidence >= 60 ? ("green" as const)
    : smoothedConfidence >= 38 ? ("yellow" as const)
    : ("red" as const);

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
          sub: `${smoothedConfidence}% confidence`,
          tone: "green" as const,
        };
      }
      if (frameStatus === "unfocused") {
        return {
          text: "Sitting but not focused",
          sub: `${smoothedConfidence}% · look at your book`,
          tone: "yellow" as const,
        };
      }
      return {
        text: "Not studying",
        sub: `${smoothedConfidence}% · settle in to continue`,
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
    <div className="flex min-h-[min(100dvh,52rem)] flex-col gap-4">

      {/* ── Large camera preview ── */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black ring-1 ring-white/5">
        <div className="relative aspect-[4/3] w-full">
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored={facing === "user"}
            videoConstraints={{
              facingMode: facing,
              width: { ideal: 1280 },
              height: { ideal: 960 },
            }}
            onUserMedia={() => setVideoReady(true)}
            className="h-full w-full object-cover"
          />
          {/* Skeleton overlay */}
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          />

          {/* Flip camera button — top-right overlay */}
          <button
            type="button"
            onClick={() =>
              setFacing(facing === "user" ? "environment" : "user")
            }
            className="absolute top-3 right-3 flex items-center gap-1.5 rounded-xl bg-black/55 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm ring-1 ring-white/10 transition-opacity active:opacity-70"
            aria-label={
              facing === "user"
                ? "Switch to back camera"
                : "Switch to front camera"
            }
          >
            <RefreshCw className="h-4 w-4" />
            {facing === "user" ? "Back" : "Front"}
          </button>

          {/* Privacy badge — bottom-left */}
          <div className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-1 text-[8px] font-medium leading-tight text-zinc-200 ring-1 ring-white/10">
            🔒 On-device only · Private
          </div>

          {/* Subject label — bottom-right */}
          <div className="absolute right-2 bottom-2 max-w-[55%] truncate rounded-md bg-black/75 px-2 py-1 text-[9px] font-medium text-zinc-300 ring-1 ring-white/10">
            {subj}
          </div>
        </div>
      </div>

      {/* ── Camera positioning instruction — always visible ── */}
      <div className="kal-glass-subtle flex items-start gap-2.5 rounded-xl px-4 py-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kal-accent" aria-hidden />
        <p className="text-xs leading-relaxed text-kal-muted">
          <span className="font-semibold text-kal-text-secondary">Camera tip:</span>{" "}
          Position your camera so that both your face and hands, as well as the book or
          notes you are studying, are clearly visible in the frame. The camera can be a
          little far — just make sure your study setup is in view.
        </p>
      </div>

      {/* ── Back camera suggestion (only when front camera is active) ── */}
      {facing === "user" ? (
        <div className="kal-glass-subtle flex items-center gap-3 rounded-xl px-4 py-3">
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-kal-muted">
            If seeing yourself is distracting, switch to back camera so the
            screen faces away from you and points toward your book or desk.
          </p>
          <button
            type="button"
            onClick={() => setFacing("environment")}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-xs font-semibold text-kal-text-secondary transition-colors hover:bg-kal-card-muted active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Back camera
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFacing("user")}
          className="self-start text-xs text-kal-muted underline underline-offset-2 hover:text-kal-text"
        >
          Switch to front camera
        </button>
      )}

      {/* ── Status chip ── */}
      <div
        className={clsx(
          "rounded-2xl border px-4 py-3 transition-colors duration-500",
          statusLabel.tone === "green" &&
            "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30",
          statusLabel.tone === "yellow" &&
            "border-amber-400/60 bg-amber-50 dark:bg-amber-950/30",
          statusLabel.tone === "red" &&
            "border-orange-400/60 bg-orange-50 dark:bg-orange-950/30",
          statusLabel.tone === "neutral" && "border-kal-border bg-kal-card-muted",
        )}
      >
        <p
          className={clsx(
            "text-sm font-bold",
            statusLabel.tone === "green" && "text-emerald-800 dark:text-emerald-200",
            statusLabel.tone === "yellow" && "text-amber-800 dark:text-amber-200",
            statusLabel.tone === "red" && "text-orange-800 dark:text-orange-200",
            statusLabel.tone === "neutral" && "text-kal-text",
          )}
        >
          {statusLabel.text}
        </p>
        <p
          className={clsx(
            "mt-1 text-xs",
            statusLabel.tone === "green" && "text-emerald-700 dark:text-emerald-300/80",
            statusLabel.tone === "yellow" && "text-amber-700 dark:text-amber-300/80",
            statusLabel.tone === "red" && "text-orange-700 dark:text-orange-300/80",
            statusLabel.tone === "neutral" && "text-kal-muted",
          )}
        >
          {statusLabel.sub}
        </p>
      </div>

      {/* ── Confidence bar ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
            Study confidence
          </span>
          <span
            className={clsx(
              "text-[11px] font-bold tabular-nums transition-colors duration-300",
              confTone === "green" && "text-emerald-600 dark:text-emerald-400",
              confTone === "yellow" && "text-amber-600 dark:text-amber-400",
              confTone === "red" && "text-orange-600 dark:text-orange-400",
            )}
          >
            {smoothedConfidence}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-kal-card-muted dark:bg-zinc-800/70">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-300 ease-out",
              confTone === "green" && "bg-emerald-500 dark:bg-emerald-400",
              confTone === "yellow" && "bg-amber-500 dark:bg-amber-400",
              confTone === "red" && "bg-orange-500",
            )}
            style={{ width: `${smoothedConfidence}%` }}
          />
        </div>
      </div>

      {/* ── Clock + sub-scores ── */}
      <div className="flex items-start gap-4">
        <div>
          <p
            className={clsx(
              "font-mono text-5xl font-bold tabular-nums tracking-tight",
              phase === "running" ? "text-kal-text" : "text-kal-muted",
            )}
          >
            {formatClock(phase === "idle" ? 0 : displaySeconds)}
          </p>
          <p className="mt-1 text-[10px] text-kal-muted">
            Studying time only
          </p>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-1.5 pt-1">
          {(
            [
              { key: "head", label: "Head", value: subScores.head },
              { key: "gaze", label: "Gaze", value: subScores.gaze },
              { key: "body", label: "Body", value: subScores.body },
              { key: "hands", label: "Hands", value: subScores.hands },
            ] as const
          ).map(({ key, label, value }) => (
            <div
              key={key}
              className="rounded-xl border border-kal-border bg-kal-card-muted px-2 py-1.5 text-center"
            >
              <div className="text-[9px] font-medium uppercase tracking-wide text-kal-muted">
                {label}
              </div>
              <div
                className={clsx(
                  "mt-0.5 text-xs font-bold tabular-nums transition-colors duration-300",
                  value >= 60
                    ? "text-emerald-600 dark:text-emerald-400"
                    : value >= 35
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-kal-muted",
                )}
              >
                {value}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gentle notice when auto-paused ── */}
      {gentleNotice && phase === "paused" ? (
        <p className="rounded-xl border border-amber-400/50 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/25 dark:text-amber-200">
          We paused because we couldn&apos;t see a steady studying signal.
          Tap Resume when you&apos;re back.
        </p>
      ) : null}

      {loadError ? (
        <p className="text-xs text-kal-danger-text">{loadError}</p>
      ) : !modelsReady ? (
        <p className="text-xs text-kal-muted">
          Loading face, pose, and hand models (on-device)…
        </p>
      ) : null}

      {/* ── Action buttons ── */}
      <div className="mt-auto flex flex-wrap justify-center gap-2 pb-1">
        {phase === "idle" ? (
          <button
            type="button"
            onClick={startSession}
            disabled={!modelsReady}
            className="kal-btn-accent inline-flex min-h-[52px] min-w-[10rem] items-center justify-center gap-2 px-6 text-base disabled:opacity-40"
          >
            <Play className="h-5 w-5" />
            Start session
          </button>
        ) : null}
        {phase === "idle" ? (
          <p className="w-full text-center text-[11px] text-kal-muted">
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
            className="kal-btn-accent inline-flex min-h-[52px] min-w-[8rem] items-center justify-center gap-2 px-5 text-base"
          >
            <Play className="h-5 w-5" />
            Resume
          </button>
        ) : null}

        {phase !== "idle" ? (
          <button
            type="button"
            onClick={() => void endAndLog()}
            className="inline-flex min-h-[52px] min-w-[8rem] items-center justify-center gap-2 rounded-2xl border-2 border-kal-danger-border bg-kal-danger-soft px-5 text-base font-semibold text-kal-danger-text"
          >
            <Square className="h-5 w-5" />
            End session
          </button>
        ) : null}

        {/* Manual override: user asserts they are studying for 30 s */}
        {modelsReady ? (
          <button
            type="button"
            onClick={triggerOverride}
            disabled={overrideSecondsLeft > 0}
            className={clsx(
              "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-semibold transition-all duration-200",
              overrideSecondsLeft > 0
                ? "border border-emerald-500/40 bg-emerald-50 text-emerald-700 opacity-90 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "border border-kal-border bg-kal-card-muted text-kal-muted hover:border-kal-text/20 hover:text-kal-text-secondary",
            )}
            title="Override detection for 30 seconds"
          >
            <Check className="h-4 w-4" />
            {overrideSecondsLeft > 0
              ? `Override active · ${overrideSecondsLeft}s`
              : "I'm studying"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
