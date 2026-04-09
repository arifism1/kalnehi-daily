export type SubscriptionTier = "basic" | "pro" | "pro_max";

/**
 * Every gatable feature in the app. Keys map 1:1 to the feature table.
 *
 *   "allowed"  → user can access freely
 *   "limited"  → user can access with restrictions (basic timer, basic habits, etc.)
 *   "blocked"  → user sees upgrade prompt
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
  | "heatmap"
  | "consistency_tracker"
  | "revision"
  | "habits"
  | "motivation"
  | "meditation"
  | "meditation_consistency"
  | "doubts"
  | "ai_photo_scan"
  | "ai_voice";

const FEATURE_ACCESS: Record<SubscriptionTier, Record<FeatureKey, FeatureAccess>> = {
  basic: {
    plan_my_day: "limited",
    dictate_day: "blocked",
    handwritten_scanner: "blocked",
    self_type_day: "allowed",
    syllabus: "limited",
    marks_engine: "blocked",
    execution_planner: "blocked",
    timer: "limited",
    progress: "blocked",
    daily_log: "blocked",
    heatmap: "blocked",
    consistency_tracker: "blocked",
    revision: "blocked",
    habits: "limited",
    motivation: "blocked",
    meditation: "blocked",
    meditation_consistency: "blocked",
    doubts: "blocked",
    ai_photo_scan: "blocked",
    ai_voice: "blocked",
  },
  pro: {
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
    heatmap: "allowed",
    consistency_tracker: "allowed",
    revision: "allowed",
    habits: "allowed",
    motivation: "allowed",
    meditation: "allowed",
    meditation_consistency: "allowed",
    doubts: "allowed",
    ai_photo_scan: "allowed",
    ai_voice: "allowed",
  },
  pro_max: {
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
    heatmap: "allowed",
    consistency_tracker: "allowed",
    revision: "allowed",
    habits: "allowed",
    motivation: "allowed",
    meditation: "allowed",
    meditation_consistency: "allowed",
    doubts: "allowed",
    ai_photo_scan: "allowed",
    ai_voice: "allowed",
  },
};

/** Human-readable upgrade prompt per blocked feature. */
export const FEATURE_LABELS: Record<FeatureKey, { name: string; upgradeHint: string }> = {
  plan_my_day: { name: "Plan My Day", upgradeHint: "Upgrade to Pro for all 3 planners (Dictate, Handwritten, Self Type)." },
  dictate_day: { name: "Dictate My Day", upgradeHint: "Upgrade to Pro for voice-based daily planning." },
  handwritten_scanner: { name: "Handwritten Scanner", upgradeHint: "Upgrade to Pro for AI-powered handwritten plan scanning." },
  self_type_day: { name: "Self Type Day", upgradeHint: "" },
  syllabus: { name: "Syllabus Tracker", upgradeHint: "Upgrade to Pro for full syllabus with microtopics & predictions." },
  marks_engine: { name: "Marks Engine", upgradeHint: "Upgrade to Pro for marks predictions & microtopic analysis." },
  execution_planner: { name: "Execution Planner", upgradeHint: "Upgrade to Pro for the full execution planner." },
  timer: { name: "Timer", upgradeHint: "Upgrade to Pro for the full execution timer." },
  progress: { name: "Progress Tracker", upgradeHint: "Upgrade to Pro to track your preparation progress." },
  daily_log: { name: "Daily Log", upgradeHint: "Upgrade to Pro for daily study logging." },
  heatmap: { name: "Strategic Heatmap", upgradeHint: "Upgrade to Pro for heatmap analysis." },
  consistency_tracker: { name: "Consistency Tracker", upgradeHint: "Upgrade to Pro for the consistency calendar." },
  revision: { name: "Revision Engine", upgradeHint: "Upgrade to Pro for the revision engine." },
  habits: { name: "Habit Maker", upgradeHint: "Upgrade to Pro for full habit tracking with streaks." },
  motivation: { name: "Personal Motivation Vault", upgradeHint: "Upgrade to Pro for the motivation vault." },
  meditation: { name: "Meditation", upgradeHint: "Upgrade to Pro for meditation sessions." },
  meditation_consistency: { name: "Meditation Consistency", upgradeHint: "Upgrade to Pro for meditation consistency tracking." },
  doubts: { name: "Doubt Tracker", upgradeHint: "Upgrade to Pro for doubt tracking." },
  ai_photo_scan: { name: "AI Photo Scan", upgradeHint: "Upgrade to Pro for AI-powered photo scanning." },
  ai_voice: { name: "AI Voice Dictation", upgradeHint: "Upgrade to Pro for AI voice dictation." },
};

export type TierConfig = {
  id: SubscriptionTier;
  name: string;
  monthlyPricePaise: number;
  monthlyPriceDisplay: string;
  trialPricePaise: number;
  trialPriceDisplay: string;
  trialDays: number;
  /** AI caps during the 3-day trial (separate from full monthly quota). */
  trialPhotoScansLimit: number;
  trialVoiceMinutesLimit: number;
  photoScansPerMonth: number;
  voiceMinutesPerMonth: number;
  maxTasksPerDay: number | null;
  tagline: string;
  benefits: string[];
};

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  basic: {
    id: "basic",
    name: "Basic",
    monthlyPricePaise: 9900,
    monthlyPriceDisplay: "₹99",
    trialPricePaise: 900,
    trialPriceDisplay: "₹9",
    trialDays: 3,
    trialPhotoScansLimit: 0,
    trialVoiceMinutesLimit: 0,
    photoScansPerMonth: 0,
    voiceMinutesPerMonth: 0,
    maxTasksPerDay: 10,
    tagline: "Get organized",
    benefits: [
      "Self Type planner (up to 10 tasks/day)",
      "Basic syllabus (subjects + chapters)",
      "Basic timer",
      "Basic habit tracking",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPricePaise: 29900,
    monthlyPriceDisplay: "₹299",
    trialPricePaise: 2100,
    trialPriceDisplay: "₹21",
    trialDays: 3,
    trialPhotoScansLimit: 5,
    trialVoiceMinutesLimit: 10,
    photoScansPerMonth: 20,
    voiceMinutesPerMonth: 40,
    maxTasksPerDay: null,
    tagline: "Most popular",
    benefits: [
      "All 3 planners (Dictate + Handwritten + Self Type)",
      "Full syllabus with microtopics & predictions",
      "Full execution planner + timer",
      "Progress, Daily Log, Heatmap",
      "Revision Engine",
      "Full habits with streaks",
      "Personal Motivation Vault",
      "Meditation + Consistency",
      "Doubt Tracker",
      "20 AI photo scans / month (after trial)",
      "40 AI voice minutes / month (after trial)",
    ],
  },
  pro_max: {
    id: "pro_max",
    name: "Pro Max",
    monthlyPricePaise: 49900,
    monthlyPriceDisplay: "₹499",
    trialPricePaise: 4900,
    trialPriceDisplay: "₹49",
    trialDays: 3,
    trialPhotoScansLimit: 10,
    trialVoiceMinutesLimit: 20,
    photoScansPerMonth: 50,
    voiceMinutesPerMonth: 80,
    maxTasksPerDay: null,
    tagline: "Maximum power",
    benefits: [
      "Everything in Pro",
      "50 AI photo scans / month (after trial)",
      "80 AI voice minutes / month (after trial)",
      "Priority support",
    ],
  },
};

export const TIER_ORDER: SubscriptionTier[] = ["basic", "pro", "pro_max"];

export const DEFAULT_TIER: SubscriptionTier = "pro";

export function getTierConfig(tier: string | null | undefined): TierConfig {
  if (tier === "basic" || tier === "pro" || tier === "pro_max") return TIERS[tier];
  return TIERS.pro;
}

export function getFeatureAccess(
  tier: string | null | undefined,
  feature: FeatureKey,
): FeatureAccess {
  const t: SubscriptionTier =
    tier === "basic" || tier === "pro" || tier === "pro_max" ? tier : "basic";
  return FEATURE_ACCESS[t][feature];
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

export function canUseAi(tier: string | null | undefined): boolean {
  return !isFeatureBlocked(tier, "ai_photo_scan");
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
  type: "photo_scans" | "voice_minutes";
};

export const EXTRA_CREDIT_PACKS: ExtraCreditPack[] = [
  {
    id: "photo_scans_10",
    label: "10 Extra Photo Scans",
    amount: 10,
    pricePaise: 9900,
    priceDisplay: "₹99",
    type: "photo_scans",
  },
  {
    id: "photo_scans_30",
    label: "30 Extra Photo Scans",
    amount: 30,
    pricePaise: 24900,
    priceDisplay: "₹249",
    type: "photo_scans",
  },
  {
    id: "voice_minutes_20",
    label: "20 Extra Voice Minutes",
    amount: 20,
    pricePaise: 14900,
    priceDisplay: "₹149",
    type: "voice_minutes",
  },
];

export const EXTRA_CREDITS_BY_ID: Record<string, ExtraCreditPack> =
  Object.fromEntries(EXTRA_CREDIT_PACKS.map((p) => [p.id, p]));
