/**
 * On-device study detection scoring from MediaPipe Face / Pose / Hand landmarks.
 * No network calls — all inputs are normalized landmark coordinates from the browser.
 */

export type StudyDetectionSensitivity = "strict" | "balanced" | "lenient";

const SENSITIVITY = {
  strict: {
    studyingMin: 0.62,
    unfocusedMax: 0.56,
    headDownBonus: 0.012,
  },
  balanced: {
    // Raised from 0.48 — simply being still + facing camera no longer triggers this.
    studyingMin: 0.52,
    unfocusedMax: 0.44,
    headDownBonus: 0.01,
  },
  lenient: {
    // Raised from 0.36 — phone-in-selfie false positives fall well below this.
    studyingMin: 0.44,
    unfocusedMax: 0.36,
    headDownBonus: 0.008,
  },
} as const;

export type StudyStatusUi = "studying" | "unfocused" | "not_studying";

export type StudyFrameSignals = {
  /** 0–100 overall confidence that the user is actively studying */
  confidencePct: number;
  status: StudyStatusUi;
  /** Sub-scores 0–1 for the live UI breakdown */
  faceHeadDown: number;
  /** Iris gaze direction: >0.5 = looking down, 0.5 = neutral (or unavailable), <0.5 = looking up */
  gazeDown: number;
  bodyStable: number;
  handsDesk: number;
};

type NL = import("@mediapipe/tasks-vision").NormalizedLandmark;

type FaceInput = {
  landmarks: NL[] | undefined;
  prevNose: { x: number; y: number } | null;
};

type PoseInput = {
  landmarks: NL[] | undefined;
  prevShoulderMid: { x: number; y: number } | null;
};

type HandInput = {
  /** Up to 2 hands; each has 21 landmarks */
  landmarks: NL[][] | undefined;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Iris gaze score using the 478-pt face_landmarker model (iris indices 468–477).
 * Measures how far down the iris centre sits relative to each eye's vertical midpoint.
 * Returns 0.5 (neutral) when iris landmarks are absent.
 */
function scoreGaze(lm: NL[]): number {
  if (lm.length < 478) return 0.5;
  const li = lm[468];
  const ri = lm[473];
  const lt = lm[159];
  const lb = lm[145];
  const rt = lm[386];
  const rb = lm[374];
  if (!li || !ri || !lt || !lb || !rt || !rb) return 0.5;
  const lMid = (lt.y + lb.y) / 2;
  const rMid = (rt.y + rb.y) / 2;
  const lH = Math.abs(lt.y - lb.y) + 0.004;
  const rH = Math.abs(rt.y - rb.y) + 0.004;
  // Positive delta → iris below eye centre → looking down
  const gazeVal = ((li.y - lMid) / lH + (ri.y - rMid) / rH) / 2;
  return clamp01(0.5 + gazeVal * 1.4);
}

/**
 * Face: head tilted toward desk (nose below eye line), low jitter, gaze downward.
 */
function scoreFace(
  face: FaceInput,
  headDownOffset: number,
): {
  score: number;
  headDown: number;
  gazeDown: number;
  nextNose: { x: number; y: number } | null;
} {
  const lm = face.landmarks;
  if (!lm || lm.length < 264 || !lm[1] || !lm[33] || !lm[263]) {
    return { score: 0, headDown: 0, gazeDown: 0.5, nextNose: null };
  }
  const nose = lm[1];
  const le = lm[33];
  const re = lm[263];
  const eyeY = (le.y + re.y) / 2;

  // Scale-invariant head tilt: normalise the nose-to-eye-line distance by the
  // inter-ocular width so the score is the same whether the face is close
  // (large, selfie) or far (small, desk camera). Raw pixel distance alone
  // saturates at 1.0 for any close-up regardless of actual tilt angle.
  const faceWidth = Math.hypot(le.x - re.x, le.y - re.y) + 0.001;
  const tiltRatio = (nose.y - eyeY) / faceWidth;
  // Neutral frontal face ≈ 0.38. Reading posture pushes this to 0.50+.
  const headDown = clamp01((tiltRatio - 0.38 - headDownOffset) / 0.12);

  let move = 0.14;
  if (face.prevNose) {
    move = Math.hypot(nose.x - face.prevNose.x, nose.y - face.prevNose.y);
  }
  // stillness is a minor bonus; it must not dominate (holding a phone is also still).
  const still = clamp01(1 - Math.min(1, move * 38));
  const gazeDown = scoreGaze(lm);

  // headDown and gaze are the real discriminators vs. "looking at phone".
  // stillness alone cannot earn a high score.
  const score = 0.55 * headDown + 0.10 * still + 0.35 * gazeDown;
  return {
    score: clamp01(score),
    headDown,
    gazeDown,
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
      ? clamp01(((lm[15].y + lm[16].y) / 2 - shoulderMid.y) / 0.15)
      : 0.4;

  // wristsLow is now the dominant pose signal: when holding a phone the wrists are
  // at or above shoulder level (score ≈ 0); when reading at a desk the wrists are
  // well below the shoulders (score → 1). stillness alone no longer dominates.
  const score = 0.35 * leanForward + 0.20 * stable + 0.45 * wristsLow;
  return { score: clamp01(score), nextShoulderMid: shoulderMid };
}

/**
 * Frame coverage: measures the vertical spread between the student's face
 * (upper frame) and their hands/wrists (lower frame).
 *
 * A proper camera-study setup has:
 *   face at y ≈ 0.15–0.35   (top portion of frame)
 *   wrists at y ≈ 0.60–0.90 (bottom portion of frame, near book/desk)
 *   → spread ≈ 0.40–0.65
 *
 * Holding a phone in selfie mode has face and wrists clustered at the same
 * height → spread ≈ 0–0.15, coverage ≈ 0.
 *
 * This score acts as a multiplier so the combined confidence stays low unless
 * the frame genuinely shows both the student and their study material.
 */
function scoreFrameCoverage(
  faceLm: NL[] | undefined,
  poseLm: NL[] | undefined,
  handLm: NL[][] | undefined,
): number {
  // Face Y — prefer pose nose (lm[0]) because it's in the same coord space as
  // pose wrists; fall back to face landmarker nose tip (lm[1]).
  let faceY: number | null = null;
  if (poseLm && poseLm[0]) faceY = poseLm[0].y;
  else if (faceLm && faceLm[1]) faceY = faceLm[1].y;

  if (faceY === null) return 0.5; // no face detected → neutral (don't penalise)

  // Lowest wrist Y — take the hand furthest down in the frame.
  // Prefer pose wrists (lm[15], lm[16]); fall back to HandLandmarker wrists (lm[0]).
  let wristY: number | null = null;
  if (poseLm) {
    if (poseLm[15]) wristY = poseLm[15].y;
    if (poseLm[16]) {
      wristY = wristY !== null ? Math.max(wristY, poseLm[16].y) : poseLm[16].y;
    }
  }
  if (wristY === null && handLm) {
    for (const h of handLm) {
      if (h && h[0]) {
        wristY = wristY !== null ? Math.max(wristY, h[0].y) : h[0].y;
      }
    }
  }

  if (wristY === null) return 0.5; // wrists not visible → neutral

  // Vertical spread: how far below the face are the wrists?
  //   spread ≤ 0.15 → phone-holding cluster → coverage 0
  //   spread ≥ 0.40 → clear desk/book setup  → coverage 1
  const spread = wristY - faceY;
  return clamp01((spread - 0.15) / 0.25);
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
    // Require wrists clearly below mid-frame (y > 0.45) before scoring high.
    // Holding a phone at face level has wrists at y ≈ 0.4–0.5 → low score.
    // Hands resting on a desk are at y ≈ 0.70–0.90 → high score.
    const low = clamp01((wrist.y - 0.45) / 0.45);
    best = Math.max(best, low);
  }
  return clamp01(0.35 + 0.65 * best);
}

/**
 * Combine modalities. If pose is missing (cropped face-only shot), rely on face + hands.
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

  // Frame coverage: penalises phone-holding (face ≈ wrist height) and rewards
  // proper setups where the camera sees both the face and the desk/book below.
  // Range [0.60, 1.0]: a score of 0 halves confidence; score of 1 leaves it intact.
  const coverage = scoreFrameCoverage(face.landmarks, pose.landmarks, hand.landmarks);
  const coverageMult = clamp01(0.60 + 0.40 * coverage);

  const hasPose = p.score > 0.08;
  let combined: number;
  if (hasPose) {
    combined = (0.42 * f.score + 0.38 * p.score + 0.20 * h) * coverageMult;
  } else {
    combined = (0.62 * f.score + 0.38 * h) * coverageMult;
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
    gazeDown: f.gazeDown,
    bodyStable: p.score,
    handsDesk: h,
    nextNose: f.nextNose,
    nextShoulderMid: p.nextShoulderMid,
  };
}

export const STUDY_TIMING_MS = {
  /** Must see studying signal this long while idle before auto-starting */
  idleAutoStart: 5_000,
  /** Not studying this long while running → auto-pause */
  runningAutoPause: 30_000,
} as const;

export function isFrameStudying(
  confidencePct: number,
  sensitivity: StudyDetectionSensitivity,
): boolean {
  const s = SENSITIVITY[sensitivity];
  return confidencePct / 100 >= s.studyingMin;
}
