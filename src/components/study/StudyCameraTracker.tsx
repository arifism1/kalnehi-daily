"use client";

import clsx from "clsx";
import { Bot, Check, Info, Pause, Play, RefreshCw, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";

import { deductAiStudyPartnerTime } from "@/actions/aiStudyPartner";
import { applyOptimisticStudySessionCreate } from "@/lib/studySessionMutations";
import {
  computeStudyFrameSignals,
  isFrameStudying,
  STUDY_TIMING_MS,
  type StudyDetectionSensitivity,
  type StudyStatusUi,
} from "@/lib/studyDetection";
import {
  applyWidestZoomToTrack,
  getStudyCameraBaseVideoConstraints,
  selectWideAngleDeviceId,
} from "@/lib/studyCameraVideoUtils";
import { useSettingsStore } from "@/store/useSettingsStore";
import { USER_ERROR } from "@/lib/userFacingErrors";

/**
 * Face + Pose + Hand run in-browser via MediaPipe Tasks Vision (WASM).
 * Optional Gemini spot-checks send a single JPEG per interval when enabled in settings.
 * Session end logs metadata only (no video stored by Kalnehi).
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
const VISION_VERDICT_TTL_MS = 3 * 60 * 1000;

type VisionVerdict = {
  person_visible: boolean;
  is_studying: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
  checkedAt: number;
};

function captureFrameBase64FromVideo(
  video: HTMLVideoElement,
  maxWidth = 854,
): string | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (w < 2 || h < 2) return null;
  const scale = Math.min(1, maxWidth / w);
  const cw = Math.max(2, Math.round(w * scale));
  const ch = Math.max(2, Math.round(h * scale));
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, cw, ch);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  const i = dataUrl.indexOf("base64,");
  if (i < 0) return null;
  return dataUrl.slice(i + 7);
}

function isVisionVerdictFresh(v: VisionVerdict | null): boolean {
  if (!v) return false;
  return Date.now() - v.checkedAt <= VISION_VERDICT_TTL_MS;
}

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

const AI_PARTNER_EARLY_INTERVAL_MS = 30_000;          // 30s between checks for first 3 min
const AI_PARTNER_LATE_INTERVAL_MS = 3.5 * 60 * 1000; // 3.5 min after the early phase
const AI_PARTNER_EARLY_CHECKS = 6;                    // 6 × 30s = 3 minutes of early checks
const PARTNER_FEEDBACK_VISIBLE_MS = 12_000;

type Props = {
  subject: string;
  userId: string;
  aiPartnerMode?: boolean;
  onDone: () => void;
};

export function StudyCameraTracker({ subject, userId, aiPartnerMode = false, onDone }: Props) {
  const facing = useSettingsStore((s) => s.studyCameraFacing);
  const setFacing = useSettingsStore((s) => s.setStudyCameraFacing);
  const sensitivity = useSettingsStore(
    (s) => s.studyDetectionSensitivity,
  ) as StudyDetectionSensitivity;
  const studyCameraVisionVerify =
    useSettingsStore((s) => s.studyCameraVisionVerify ?? true);
  const studyCameraVerifyIntervalMin =
    useSettingsStore((s) => s.studyCameraVerifyIntervalMin ?? 3);

  const [videoReady, setVideoReady] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

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
  const studyCameraVisionVerifyRef = useRef(studyCameraVisionVerify);
  const visionVerdictRef = useRef<VisionVerdict | null>(null);
  const visionDismissedRef = useRef(false);
  /** True when the current paused state was caused by a high-confidence vision "not studying" check. */
  const visionPausedByCheckRef = useRef(false);
  const visionVerifyInFlightRef = useRef(false);
  const firstVisionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wideSelectionDoneRef = useRef(false);

  // AI Partner refs
  const firstPartnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partnerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const partnerInFlightRef = useRef(false);
  const partnerFeedbackHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    facingRef.current = facing;
  }, [facing]);

  useEffect(() => {
    studyCameraVisionVerifyRef.current = studyCameraVisionVerify;
  }, [studyCameraVisionVerify]);

  useEffect(() => {
    wideSelectionDoneRef.current = false;
    setSelectedDeviceId(null);
    setVideoReady(false);
  }, [facing]);

  const videoConstraints = useMemo(
    () => getStudyCameraBaseVideoConstraints(facing, selectedDeviceId),
    [facing, selectedDeviceId],
  );

  const handleUserMedia = useCallback((stream: MediaStream) => {
    setVideoReady(true);
    const track = stream.getVideoTracks()[0];
    applyWidestZoomToTrack(track);
    if (wideSelectionDoneRef.current) return;
    wideSelectionDoneRef.current = true;
    const currentId = track?.getSettings().deviceId;
    void navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const next = selectWideAngleDeviceId(devices, facing, currentId);
        if (next) setSelectedDeviceId(next);
      })
      .catch(() => {
        /* keep default track */
      });
  }, [facing]);

  const [modelsReady, setModelsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [smoothedConfidence, setSmoothedConfidence] = useState(0);
  const [subScores, setSubScores] = useState({ head: 0, gaze: 50, body: 0, hands: 35 });
  const [frameStatus, setFrameStatus] = useState<StudyStatusUi>("not_studying");
  const [autoPaused, setAutoPaused] = useState(false);
  const [gentleNotice, setGentleNotice] = useState(false);
  const [overrideSecondsLeft, setOverrideSecondsLeft] = useState(0);
  const [visionBannerReason, setVisionBannerReason] = useState<string | null>(null);
  const [visionAutoPaused, setVisionAutoPaused] = useState(false);
  const [visionVerdictUi, setVisionVerdictUi] = useState<VisionVerdict | null>(null);

  // AI Partner state
  const [partnerFeedback, setPartnerFeedback] = useState<string | null>(null);
  const [partnerFeedbackVisible, setPartnerFeedbackVisible] = useState(false);

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
      if (partnerFeedbackHideRef.current) clearTimeout(partnerFeedbackHideRef.current);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
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
    setVisionAutoPaused(false);
    setVisionBannerReason(null);
    visionVerdictRef.current = null;
    visionDismissedRef.current = false;
    setVisionVerdictUi(null);
    visionPausedByCheckRef.current = false;
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
    visionPausedByCheckRef.current = false;
    sessionPhaseRef.current = "paused";
    setPhase("paused");
  }, []);

  const resumeSession = useCallback(() => {
    setAutoPaused(false);
    setGentleNotice(false);
    setVisionAutoPaused(false);
    setVisionBannerReason(null);
    visionPausedByCheckRef.current = false;
    badMsRef.current = 0;
    lastTsRef.current = performance.now();
    sessionPhaseRef.current = "running";
    setPhase("running");
  }, []);

  const dismissVisionBanner = useCallback(() => {
    visionDismissedRef.current = true;
    setVisionBannerReason(null);
    if (!visionPausedByCheckRef.current) return;
    visionPausedByCheckRef.current = false;
    badMsRef.current = 0;
    lastTsRef.current = performance.now();
    sessionPhaseRef.current = "running";
    setVisionAutoPaused(false);
    setAutoPaused(false);
    setGentleNotice(false);
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
      setVisionAutoPaused(false);
      setVisionBannerReason(null);
      visionVerdictRef.current = null;
      setVisionVerdictUi(null);
      visionDismissedRef.current = false;
      visionPausedByCheckRef.current = false;
      idleGoodMsRef.current = 0;
      badMsRef.current = 0;
    };

    if (!started || durSec < 1) {
      resetSessionUi();
      onDone();
      return;
    }

    if (aiPartnerMode && durSec > 0) {
      deductAiStudyPartnerTime(durSec).catch((err: unknown) =>
        console.error("[StudyCameraTracker] deductAiStudyPartnerTime error", err),
      );
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
  }, [subject, userId, aiPartnerMode, onDone]);

  // Gemini spot-checks: first after 90s, then on a fixed interval (default 3 min).
  useEffect(() => {
    if (firstVisionTimeoutRef.current) {
      clearTimeout(firstVisionTimeoutRef.current);
      firstVisionTimeoutRef.current = null;
    }
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    if (phase !== "running" || !studyCameraVisionVerify || !modelsReady || !videoReady) {
      return;
    }
    const intervalMs = studyCameraVerifyIntervalMin * 60 * 1000;

    const runVerify = async () => {
      if (sessionPhaseRef.current !== "running" || !studyCameraVisionVerifyRef.current) {
        return;
      }
      if (visionVerifyInFlightRef.current) return;
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) return;
      visionVerifyInFlightRef.current = true;
      try {
        const b64 = captureFrameBase64FromVideo(video, 640);
        if (!b64) return;
        const res = await fetch("/api/study-camera/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ frame: b64 }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          verdict?: Omit<VisionVerdict, "checkedAt">;
        };
        if (sessionPhaseRef.current !== "running" || !res.ok || !data.ok || !data.verdict) {
          return;
        }
        const v: VisionVerdict = { ...data.verdict, checkedAt: Date.now() };
        visionVerdictRef.current = v;
        visionDismissedRef.current = false;
        setVisionVerdictUi(v);
        if (!v.is_studying && v.confidence === "high") {
          if (sessionPhaseRef.current === "running") {
            sessionPhaseRef.current = "paused";
            visionPausedByCheckRef.current = true;
            setPhase("paused");
            setVisionAutoPaused(true);
            setAutoPaused(false);
            setGentleNotice(false);
            setVisionBannerReason(v.reason);
            badMsRef.current = 0;
          }
        }
      } catch {
        /* keep MediaPipe-only behaviour */
      } finally {
        visionVerifyInFlightRef.current = false;
      }
    };

    firstVisionTimeoutRef.current = setTimeout(() => {
      void runVerify();
      visionIntervalRef.current = setInterval(() => {
        void runVerify();
      }, intervalMs);
    }, 90_000);

    return () => {
      if (firstVisionTimeoutRef.current) {
        clearTimeout(firstVisionTimeoutRef.current);
        firstVisionTimeoutRef.current = null;
      }
      if (visionIntervalRef.current) {
        clearInterval(visionIntervalRef.current);
        visionIntervalRef.current = null;
      }
    };
  }, [phase, studyCameraVisionVerify, studyCameraVerifyIntervalMin, modelsReady, videoReady]);

  // AI Partner feedback loop: every 30s for first 3 min, then every 3.5 min
  useEffect(() => {
    if (firstPartnerTimeoutRef.current) {
      clearTimeout(firstPartnerTimeoutRef.current);
      firstPartnerTimeoutRef.current = null;
    }
    if (partnerIntervalRef.current) {
      clearInterval(partnerIntervalRef.current);
      partnerIntervalRef.current = null;
    }
    if (!aiPartnerMode || phase !== "running" || !modelsReady || !videoReady) return;

    const runFeedback = async () => {
      if (sessionPhaseRef.current !== "running") return;
      if (partnerInFlightRef.current) return;
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) return;
      partnerInFlightRef.current = true;
      try {
        const b64 = captureFrameBase64FromVideo(video, 640);
        if (!b64) return;
        const res = await fetch("/api/study-partner/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ frame: b64 }),
        });
        const data = (await res.json()) as { ok?: boolean; feedback?: string };
        if (!res.ok || !data.ok || !data.feedback) return;
        const text = data.feedback.trim();
        if (!text) return;

        // Show feedback overlay
        setPartnerFeedback(text);
        setPartnerFeedbackVisible(true);
        if (partnerFeedbackHideRef.current) clearTimeout(partnerFeedbackHideRef.current);
        partnerFeedbackHideRef.current = setTimeout(() => {
          setPartnerFeedbackVisible(false);
        }, PARTNER_FEEDBACK_VISIBLE_MS);

        // Speak via TTS
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utt = new SpeechSynthesisUtterance(text);
          utt.rate = 0.92;
          utt.pitch = 1;
          utt.volume = 1;
          window.speechSynthesis.speak(utt);
        }
      } catch {
        /* silently ignore — partner feedback is best-effort */
      } finally {
        partnerInFlightRef.current = false;
      }
    };

    // Two-phase scheduler: 30s × 6 checks (first 3 min), then 3.5 min indefinitely
    let earlyChecksLeft = AI_PARTNER_EARLY_CHECKS;

    const scheduleNext = () => {
      const delay = earlyChecksLeft > 0
        ? AI_PARTNER_EARLY_INTERVAL_MS
        : AI_PARTNER_LATE_INTERVAL_MS;
      firstPartnerTimeoutRef.current = setTimeout(() => {
        firstPartnerTimeoutRef.current = null;
        if (earlyChecksLeft > 0) earlyChecksLeft--;
        void runFeedback();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (firstPartnerTimeoutRef.current) {
        clearTimeout(firstPartnerTimeoutRef.current);
        firstPartnerTimeoutRef.current = null;
      }
    };
  }, [aiPartnerMode, phase, modelsReady, videoReady]);

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
      const baseStudying =
        isFrameStudying(signals.confidencePct, sensitivity) || isOverriding;

      const v = visionVerdictRef.current;
      const vFresh = isVisionVerdictFresh(v);
      const visOn = studyCameraVisionVerifyRef.current;

      let studyingNow = baseStudying;
      if (visOn && vFresh && v && !isOverriding) {
        if (v.is_studying) {
          studyingNow = true;
        } else if (v.confidence === "high" && !visionDismissedRef.current) {
          studyingNow = false;
        } else {
          studyingNow = baseStudying;
        }
      }
      if (isOverriding) studyingNow = true;

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
            visionPausedByCheckRef.current = false;
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

  const aiSpotOk =
    studyCameraVisionVerify &&
    isVisionVerdictFresh(visionVerdictUi) &&
    visionVerdictUi?.is_studying;
  const aiNote = aiSpotOk ? " · AI spot-check: studying" : "";

  const statusLabel = (() => {
    if (phase === "paused" && visionAutoPaused) {
      return {
        text: "Paused – Study check",
        sub: "The latest AI spot-check could not confirm active studying.",
        tone: "red" as const,
      };
    }
    if (phase === "paused" && autoPaused) {
      return {
        text: "Paused – Not studying",
        sub: "Are you still studying?",
        tone: "red" as const,
      };
    }
    if (phase === "paused") {
      return {
        text: "Paused",
        sub: "Tap Resume when you are ready to continue",
        tone: "neutral" as const,
      };
    }
    if (phase === "running") {
      if (frameStatus === "studying") {
        return {
          text: "Studying detected",
          sub: `${smoothedConfidence}% confidence${aiNote}`,
          tone: "green" as const,
        };
      }
      if (frameStatus === "unfocused") {
        return {
          text: "Sitting but not focused",
          sub: `${smoothedConfidence}% · look at your book${aiNote}`,
          tone: "yellow" as const,
        };
      }
      return {
        text: "Not studying",
        sub: `${smoothedConfidence}% · settle in to continue${aiNote}`,
        tone: "red" as const,
      };
    }
    return {
      text: "Ready",
      sub: studyCameraVisionVerify
        ? "Face + pose + hands (on-device) · optional Gemini spot-checks"
        : "Face + pose + hands (on-device)",
      tone: "neutral" as const,
    };
  })();

  return (
    <div className="flex min-h-[min(100dvh,52rem)] flex-col gap-4">

      {/* ── Camera preview (+ AI Avatar panel in partner mode) ── */}
      {aiPartnerMode ? (
        /* Split layout: avatar top / webcam bottom on mobile; webcam left / avatar right on desktop */
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">

          {/* AI Avatar Panel — top on mobile, right on desktop */}
          <div className="order-first flex flex-col items-center justify-center gap-4 rounded-2xl border border-kal-accent/20 bg-kal-card-muted px-5 py-6 sm:order-last sm:w-2/5">
            {/* Active indicator pill */}
            <div className="flex items-center gap-2 rounded-full bg-kal-accent/10 px-3 py-1.5 text-[11px] font-semibold text-kal-accent ring-1 ring-kal-accent/20">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kal-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-kal-accent" />
              </span>
              AI Study Partner Active
            </div>

            {/* Animated avatar */}
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-kal-accent/15" />
              <span className="absolute inset-3 rounded-full bg-kal-accent/10" />
              <span className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-kal-accent/15 ring-2 ring-kal-accent/30">
                <Bot className="h-9 w-9 text-kal-accent" aria-hidden />
              </span>
            </div>

            {/* Speech bubble — shows last feedback or a default motivational line */}
            <div className="w-full rounded-2xl border border-kal-border bg-kal-card px-4 py-3 text-xs leading-relaxed text-kal-text-secondary shadow-sm">
              {partnerFeedback
                ? partnerFeedback
                : phase === "running"
                  ? "Watching your desk — I\u2019ll check in with you soon!"
                  : "Start your session and I\u2019ll keep you focused."}
            </div>
          </div>

          {/* Webcam — bottom on mobile, left on desktop */}
          <div className="relative order-last w-full overflow-hidden rounded-2xl border border-white/10 bg-black ring-1 ring-white/5 sm:order-first sm:w-3/5">
            <div className="relative aspect-[4/3] w-full">
              <Webcam
                key={`sc-${facing}-${selectedDeviceId ?? "def"}`}
                ref={webcamRef}
                audio={false}
                mirrored={facing === "user"}
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                className="h-full w-full object-cover"
              />
              {/* Skeleton overlay — hidden in AI Partner mode for a cleaner look */}
              <canvas
                ref={canvasRef}
                className={clsx(
                  "pointer-events-none absolute inset-0 h-full w-full",
                  aiPartnerMode && "hidden",
                )}
                aria-hidden
              />
              <button
                type="button"
                onClick={() => setFacing(facing === "user" ? "environment" : "user")}
                className="absolute top-3 right-3 flex items-center gap-1.5 rounded-xl bg-black/55 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm ring-1 ring-white/10 transition-opacity active:opacity-70"
                aria-label={facing === "user" ? "Switch to back camera" : "Switch to front camera"}
              >
                <RefreshCw className="h-4 w-4" />
                {facing === "user" ? "Back" : "Front"}
              </button>
              <div className="absolute bottom-2 left-2 max-w-[min(100%,16rem)] rounded-md bg-black/75 px-2 py-1 text-[8px] font-medium leading-tight text-zinc-200 ring-1 ring-white/10">
                {studyCameraVisionVerify
                  ? "🔒 MediaPipe on-device · AI spot-checks (no storage)"
                  : "🔒 On-device only · Private"}
              </div>
              <div className="absolute right-2 bottom-2 max-w-[55%] truncate rounded-md bg-black/75 px-2 py-1 text-[9px] font-medium text-zinc-300 ring-1 ring-white/10">
                {subj}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard single-column webcam layout */
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black ring-1 ring-white/5">
          <div className="relative aspect-[4/3] w-full">
            <Webcam
              key={`sc-${facing}-${selectedDeviceId ?? "def"}`}
              ref={webcamRef}
              audio={false}
              mirrored={facing === "user"}
              videoConstraints={videoConstraints}
              onUserMedia={handleUserMedia}
              className="h-full w-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => setFacing(facing === "user" ? "environment" : "user")}
              className="absolute top-3 right-3 flex items-center gap-1.5 rounded-xl bg-black/55 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm ring-1 ring-white/10 transition-opacity active:opacity-70"
              aria-label={facing === "user" ? "Switch to back camera" : "Switch to front camera"}
            >
              <RefreshCw className="h-4 w-4" />
              {facing === "user" ? "Back" : "Front"}
            </button>
            <div className="absolute bottom-2 left-2 max-w-[min(100%,16rem)] rounded-md bg-black/75 px-2 py-1 text-[8px] font-medium leading-tight text-zinc-200 ring-1 ring-white/10">
              {studyCameraVisionVerify
                ? "🔒 MediaPipe on-device · optional Gemini spot-checks (no storage)"
                : "🔒 On-device only · Private"}
            </div>
            <div className="absolute right-2 bottom-2 max-w-[55%] truncate rounded-md bg-black/75 px-2 py-1 text-[9px] font-medium text-zinc-300 ring-1 ring-white/10">
              {subj}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Study Verification notice (AI Partner mode only) ── */}
      {aiPartnerMode ? (
        <div className="rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-kal-text-secondary">
            AI Study Verification
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-kal-muted">
            To ensure accurate focus tracking, we analyze a single webcam frame every 3.5 minutes
            using AI. This helps verify that you are actively studying (reading, writing, or focused
            on study material).
          </p>
          <p className="mt-1.5 text-xs font-medium text-kal-text-secondary">
            No images are stored or retained at any time.
          </p>
        </div>
      ) : null}

      {/* ── Camera positioning instruction — always visible ── */}
      <div className="kal-glass-subtle flex items-start gap-2.5 rounded-xl px-4 py-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kal-accent" aria-hidden />
        <p className="text-xs leading-relaxed text-kal-muted">
          <span className="font-semibold text-kal-text-secondary">Camera tip:</span>{" "}
          Place the phone or laptop <strong>farther back</strong> so the frame includes
          your face, your hands, and the desk/notes. On supported phones we request the{" "}
          <strong>widest (ultrawide)</strong> back lens when you use the rear camera and
          the lowest zoom the browser allows, so more of your setup fits in view.
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

      {/* ── Status chip — full detail in standard mode, minimal in AI Partner mode ── */}
      {aiPartnerMode ? (
        /* AI Partner: show only session phase, no confidence numbers */
        phase !== "idle" ? (
          <div
            className={clsx(
              "flex items-center justify-between rounded-2xl border px-4 py-3",
              phase === "running"
                ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30"
                : "border-amber-400/60 bg-amber-50 dark:bg-amber-950/30",
            )}
          >
            <p
              className={clsx(
                "text-sm font-bold",
                phase === "running"
                  ? "text-emerald-800 dark:text-emerald-200"
                  : "text-amber-800 dark:text-amber-200",
              )}
            >
              {phase === "running" ? "Session running" : "Session paused"}
            </p>
          </div>
        ) : null
      ) : (
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
      )}

      {/* ── Confidence bar — standard mode only ── */}
      {!aiPartnerMode && (
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
      )}

      {/* ── Clock (+ sub-scores in standard mode only) ── */}
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
        {!aiPartnerMode && (
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
        )}
      </div>

      {/* ── AI spot-check: not studying (high confidence) ── */}
      {visionBannerReason && phase === "paused" && visionAutoPaused ? (
        <div className="rounded-xl border border-orange-400/60 bg-orange-50 px-3 py-2.5 text-xs text-orange-900 dark:border-orange-500/40 dark:bg-orange-950/30 dark:text-orange-100">
          <p className="font-semibold">Study check</p>
          <p className="mt-1 text-orange-800/95 dark:text-orange-200/95">
            {visionBannerReason}
          </p>
          <button
            type="button"
            onClick={dismissVisionBanner}
            className="mt-2 font-semibold text-orange-800 underline underline-offset-2 dark:text-orange-200"
          >
            Dismiss &amp; resume
          </button>
        </div>
      ) : null}

      {/* ── Gentle notice when auto-paused (on-device signal) ── */}
      {gentleNotice && phase === "paused" && autoPaused && !visionAutoPaused ? (
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
