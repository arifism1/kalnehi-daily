/**
 * On-device study detection scoring from MediaPipe Face / Pose / Hand landmarks.
 * No network calls — all inputs are normalized landmark coordinates from the browser.
 */

export type StudyDetectionSensitivity = "strict" | "balanced" | "lenient";

/** Tunables per sensitivity preset (thresholds 0–1 on combined confidence). */
const SENSITIVITY = {
  strict: {
    /** Min combined confidence to count as “studying” this frame */
    studyingMin: 0.62,
    /** Below this → “unfocused” band */
    unfocusedMax: 0.58,
    headDownBonus: 0.012,
  },
  balanced: {
    studyingMin: 0.48,
    unfocusedMax: 0.42,
    headDownBonus: 0.01,
  },
  lenient: {
    studyingMin: 0.36,
    unfocusedMax: 0.32,
    headDownBonus: 0.008,
  },
} as const;

export type StudyStatusUi = "studying" | "unfocused" | "not_studying";

export type StudyFrameSignals = {
  /** 0–100 overall confidence that the user is actively studying */
  confidencePct: number;
  status: StudyStatusUi;
  /** Sub-scores 0–1 for debugging / optional UI */
  faceHeadDown: number;
  bodyStable: number;
  handsDesk: number;
};

type FaceInput = {
  landmarks: import("@mediapipe/tasks-vision").NormalizedLandmark[] | undefined;
  prevNose: { x: number; y: number } | null;
};

type PoseInput = {
  landmarks: import("@mediapipe/tasks-vision").NormalizedLandmark[] | undefined;
  prevShoulderMid: { x: number; y: number } | null;
};

type HandInput = {
  /** Up to 2 hands; each has 21 landmarks */
  landmarks: import("@mediapipe/tasks-vision").NormalizedLandmark[][] | undefined;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Face: head tilted toward desk (nose below eye line), low jitter.
 */
function scoreFace(
  face: FaceInput,
  headDownOffset: number,
): { score: number; headDown: number; nextNose: { x: number; y: number } | null } {
  const lm = face.landmarks;
  if (!lm || lm.length < 264 || !lm[1] || !lm[33] || !lm[263]) {
    return { score: 0, headDown: 0, nextNose: null };
  }
  const nose = lm[1];
  const le = lm[33];
  const re = lm[263];
  const eyeY = (le.y + re.y) / 2;
  const headDown = clamp01((nose.y - eyeY - headDownOffset) / 0.06);

  let move = 0.14;
  if (face.prevNose) {
    move = Math.hypot(nose.x - face.prevNose.x, nose.y - face.prevNose.y);
  }
  const still = clamp01(1 - Math.min(1, move * 38));
  const score = 0.55 * headDown + 0.45 * still;
  return {
    score: clamp01(score),
    headDown,
    nextNose: { x: nose.x, y: nose.y },
  };
}

/**
 * Pose: shoulders stable; nose/upper body suggests forward lean toward desk.
 */
function scorePose(pose: PoseInput): {
  score: number;
  nextShoulderMid: { x: number; y: number } | null;
} {
  const lm = pose.landmarks;
  if (!lm || lm.length < 25 || !lm[0] || !lm[11] || !lm[12]) {
    return { score: 0, nextShoulderMid: null };
  }
  const nose = lm[0];
  const ls = lm[11];
  const rs = lm[12];
  const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };

  const leanForward = clamp01((nose.y - shoulderMid.y + 0.02) / 0.12);

  let move = 0.08;
  if (pose.prevShoulderMid) {
    move = Math.hypot(
      shoulderMid.x - pose.prevShoulderMid.x,
      shoulderMid.y - pose.prevShoulderMid.y,
    );
  }
  const stable = clamp01(1 - Math.min(1, move * 28));

  const wristsLow =
    lm[15] && lm[16]
      ? clamp01(
          ((lm[15].y + lm[16].y) / 2 - shoulderMid.y) / 0.15,
        )
      : 0.4;

  const score = 0.4 * leanForward + 0.35 * stable + 0.25 * wristsLow;
  return { score: clamp01(score), nextShoulderMid: shoulderMid };
}

/**
 * Hands: visible hands in lower half of frame → reading / writing / holding.
 */
function scoreHands(hand: HandInput): number {
  const all = hand.landmarks;
  if (!all || all.length === 0) return 0.35;

  let best = 0;
  for (const h of all) {
    if (!h || !h[0]) continue;
    const wrist = h[0];
    const low = clamp01((wrist.y - 0.25) / 0.55);
    best = Math.max(best, low);
  }
  return clamp01(0.5 + 0.5 * best);
}

/**
 * Combine modalities. If pose is missing (cropped face), rely on face + hands.
 */
export function computeStudyFrameSignals(
  face: FaceInput,
  pose: PoseInput,
  hand: HandInput,
  sensitivity: StudyDetectionSensitivity,
): StudyFrameSignals & {
  nextNose: { x: number; y: number } | null;
  nextShoulderMid: { x: number; y: number } | null;
} {
  const preset = SENSITIVITY[sensitivity];
  const f = scoreFace(face, preset.headDownBonus);
  const p = scorePose(pose);
  const h = scoreHands(hand);

  const hasPose = p.score > 0.08;
  let combined: number;
  if (hasPose) {
    combined = 0.42 * f.score + 0.38 * p.score + 0.2 * h;
  } else {
    combined = 0.62 * f.score + 0.38 * h;
  }

  const confidencePct = Math.round(clamp01(combined) * 100);

  let status: StudyStatusUi;
  if (combined >= preset.studyingMin) status = "studying";
  else if (combined >= preset.unfocusedMax) status = "unfocused";
  else status = "not_studying";

  return {
    confidencePct,
    status,
    faceHeadDown: f.headDown,
    bodyStable: p.score,
    handsDesk: h,
    nextNose: f.nextNose,
    nextShoulderMid: p.nextShoulderMid,
  };
}

export const STUDY_TIMING_MS = {
  /** Must see studying signal this long (idle) before auto-starting session */
  idleAutoStart: 5_000,
  /** Not studying this long while running → auto-pause */
  runningAutoPause: 30_000,
} as const;

/** Whether this frame counts as “studying” for timing (uses sensitivity thresholds). */
export function isFrameStudying(
  confidencePct: number,
  sensitivity: StudyDetectionSensitivity,
): boolean {
  const s = SENSITIVITY[sensitivity];
  return confidencePct / 100 >= s.studyingMin;
}
