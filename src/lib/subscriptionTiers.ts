/** Single paid tier: Pro (legacy DB values basic / pro_max map to pro). */
export type SubscriptionTier = "pro";

/**
 * Every gatable feature in the app. Keys map 1:1 to the feature table.
 */
export type FeatureAccess = "allowed" | "limited" | "blocked";

export type FeatureKey =
  | "plan_my_day"
  | "dictate_day"
  | "handwritten_scanner"
  | "self_type_day"
  | "syllabus"
  | "marks_engine"
  | "execution_planner"
  | "timer"
  | "progress"
  | "daily_log"
  | "consistency_tracker"
  | "revision"
  | "habits"
  | "motivation"
  | "meditation"
  | "meditation_consistency"
  | "doubts"
  | "ai_photo_scan"
  | "ai_voice"
  | "prepbrain_ai";

const PRO_ACCESS: Record<FeatureKey, FeatureAccess> = {
  plan_my_day: "allowed",
  dictate_day: "allowed",
  handwritten_scanner: "allowed",
  self_type_day: "allowed",
  syllabus: "allowed",
  marks_engine: "allowed",
  execution_planner: "allowed",
  timer: "allowed",
  progress: "allowed",
  daily_log: "allowed",
  consistency_tracker: "allowed",
  revision: "allowed",
  habits: "allowed",
  motivation: "allowed",
  meditation: "allowed",
  meditation_consistency: "allowed",
  doubts: "allowed",
  ai_photo_scan: "allowed",
  ai_voice: "allowed",
  prepbrain_ai: "allowed",
};

/** Human-readable upgrade prompt per blocked feature. */
export const FEATURE_LABELS: Record<FeatureKey, { name: string; upgradeHint: string }> = {
  plan_my_day: { name: "Plan My Day", upgradeHint: "Subscribe to Pro for full access." },
  dictate_day: { name: "Dictate My Day", upgradeHint: "Subscribe to Pro for voice-based daily planning." },
  handwritten_scanner: {
    name: "Plan My Day",
    upgradeHint: "Subscribe to Pro for handwriting scan and planning.",
  },
  self_type_day: { name: "Self Type Day", upgradeHint: "" },
  syllabus: { name: "Syllabus Tracker", upgradeHint: "Subscribe to Pro for full syllabus with microtopics & predictions." },
  marks_engine: { name: "Marks Engine", upgradeHint: "Subscribe to Pro for marks predictions & microtopic analysis." },
  execution_planner: { name: "Execution Planner", upgradeHint: "Subscribe to Pro for the full execution planner." },
  timer: { name: "Timer", upgradeHint: "Subscribe to Pro for the full execution timer." },
  progress: { name: "Progress Tracker", upgradeHint: "Subscribe to Pro to track your preparation progress." },
  daily_log: { name: "Daily Log", upgradeHint: "Subscribe to Pro for daily study logging." },
  consistency_tracker: { name: "Consistency Tracker", upgradeHint: "Subscribe to Pro for the consistency calendar." },
  revision: { name: "Revision Engine", upgradeHint: "Subscribe to Pro for the revision engine." },
  habits: { name: "Habit Maker", upgradeHint: "Subscribe to Pro for full habit tracking with streaks." },
  motivation: { name: "Personal Motivation Vault", upgradeHint: "Subscribe to Pro for the motivation vault." },
  meditation: { name: "Meditation", upgradeHint: "Subscribe to Pro for meditation sessions." },
  meditation_consistency: { name: "Meditation Consistency", upgradeHint: "Subscribe to Pro for meditation consistency tracking." },
  doubts: { name: "Doubt Tracker", upgradeHint: "Subscribe to Pro for doubt tracking." },
  ai_photo_scan: {
    name: "Handwriting photo scans",
    upgradeHint: "Subscribe to Pro for monthly handwriting photo scans.",
  },
  ai_voice: { name: "AI Voice Dictation", upgradeHint: "Subscribe to Pro for AI voice dictation." },
  prepbrain_ai: {
    name: "PrepBrain AI",
    upgradeHint: "Subscribe to Pro for PrepBrain AI — your personalized prep coach.",
  },
};

export type TierConfig = {
  id: SubscriptionTier;
  name: string;
  monthlyPricePaise: number;
  monthlyPriceDisplay: string;
  trialPricePaise: number;
  trialPriceDisplay: string;
  trialDays: number;
  /** Razorpay paid-trial window: voice + token caps differ from monthly. */
  trialPhotoScansLimit: number;
  trialVoiceMinutesLimit: number;
  photoScansPerMonth: number;
  voiceMinutesPerMonth: number;
  maxTasksPerDay: number | null;
  tagline: string;
  benefits: string[];
};

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPricePaise: 29900,
    monthlyPriceDisplay: "₹299",
    trialPricePaise: 1900,
    trialPriceDisplay: "₹19",
    trialDays: 2,
    trialPhotoScansLimit: 5,
    trialVoiceMinutesLimit: 15,
    photoScansPerMonth: 20,
    voiceMinutesPerMonth: 60,
    maxTasksPerDay: null,
    tagline: "Everything for serious prep",
    benefits: [
      "Dictate My Day + Self Type planners",
      "Full syllabus with microtopics & predictions",
      "Full execution planner + timer",
      "Progress, Daily Log, Revision Engine",
      "Full habits, motivation, meditation",
      "Doubt Tracker & PrepBrain AI coach",
    ],
  },
};

export const TIER_ORDER: SubscriptionTier[] = ["pro"];

export const DEFAULT_TIER: SubscriptionTier = "pro";

/** Normalizes DB or legacy strings to Pro. */
export function parseSubscriptionTier(
  raw: string | null | undefined,
): SubscriptionTier | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (t === "basic" || t === "pro" || t === "pro_max") return "pro";
  return null;
}

export function compareSubscriptionTiers(
  _a: SubscriptionTier,
  _b: SubscriptionTier,
): number {
  return 0;
}

export function getTierConfig(_tier: string | null | undefined): TierConfig {
  return TIERS.pro;
}

export function getFeatureAccess(
  tier: string | null | undefined,
  feature: FeatureKey,
): FeatureAccess {
  const t = parseSubscriptionTier(tier);
  if (!t) return "blocked";
  return PRO_ACCESS[feature];
}

export function isFeatureBlocked(
  tier: string | null | undefined,
  feature: FeatureKey,
): boolean {
  return getFeatureAccess(tier, feature) === "blocked";
}

export function isFeatureLimited(
  tier: string | null | undefined,
  feature: FeatureKey,
): boolean {
  return getFeatureAccess(tier, feature) === "limited";
}

/**
 * AI voice: Pro subscribers always use paid path quotas (trial vs monthly via isTrialPeriod).
 */
export function canUseAi(
  tier: string | null | undefined,
  _isTrialPeriod = false,
): boolean {
  return !isFeatureBlocked(tier, "ai_voice");
}

export function getPhotoScansLimit(
  tier: string | null | undefined,
  isTrialPeriod: boolean,
): number {
  const c = getTierConfig(tier);
  return isTrialPeriod ? c.trialPhotoScansLimit : c.photoScansPerMonth;
}

export function getVoiceMinutesLimit(
  tier: string | null | undefined,
  isTrialPeriod: boolean,
): number {
  const c = getTierConfig(tier);
  return isTrialPeriod ? c.trialVoiceMinutesLimit : c.voiceMinutesPerMonth;
}

export function remainingPhotoScans(
  tier: string | null | undefined,
  used: number,
  bonus: number,
  isTrialPeriod: boolean,
): number {
  return Math.max(0, getPhotoScansLimit(tier, isTrialPeriod) + bonus - used);
}

export function remainingVoiceMinutes(
  tier: string | null | undefined,
  used: number,
  bonus: number,
  isTrialPeriod: boolean,
): number {
  return Math.max(0, getVoiceMinutesLimit(tier, isTrialPeriod) + bonus - used);
}

export type ExtraCreditPack = {
  id: string;
  label: string;
  amount: number;
  pricePaise: number;
  priceDisplay: string;
  type: "photo_scans" | "voice_minutes" | "ai_tokens";
};

/**
 * Sellable packs (legacy photo ids kept for webhook verification of old orders).
 */
export const EXTRA_CREDIT_PACKS: ExtraCreditPack[] = [
  {
    id: "photo_scans_10",
    label: "+10 Extra Photo Scans",
    amount: 10,
    pricePaise: 9900,
    priceDisplay: "₹99",
    type: "photo_scans",
  },
  {
    id: "photo_scans_30",
    label: "+30 Extra Photo Scans",
    amount: 30,
    pricePaise: 24900,
    priceDisplay: "₹249",
    type: "photo_scans",
  },
  {
    id: "voice_minutes_30",
    label: "+30 Extra Voice Minutes",
    amount: 30,
    pricePaise: 9900,
    priceDisplay: "₹99",
    type: "voice_minutes",
  },
  {
    id: "ai_tokens_1m",
    label: "+10 lakh PrepBrain AI tokens",
    amount: 1_000_000,
    pricePaise: 9900,
    priceDisplay: "₹99",
    type: "ai_tokens",
  },
];

/** Extra credit packs shown in My Plan (voice + AI tokens). */
export const EXTRA_CREDIT_PACKS_UI: ExtraCreditPack[] = EXTRA_CREDIT_PACKS.filter(
  (p) => p.type === "voice_minutes" || p.type === "ai_tokens",
);

export const EXTRA_CREDITS_BY_ID: Record<string, ExtraCreditPack> =
  Object.fromEntries(EXTRA_CREDIT_PACKS.map((p) => [p.id, p]));
