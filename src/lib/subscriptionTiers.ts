export type SubscriptionTier = "basic" | "pro" | "pro_max";

export type TierConfig = {
  id: SubscriptionTier;
  name: string;
  monthlyPricePaise: number;
  monthlyPriceDisplay: string;
  trialPricePaise: number;
  trialPriceDisplay: string;
  trialDays: number;
  photoScansPerMonth: number;
  voiceMinutesPerMonth: number;
  hasAi: boolean;
  hasDictateMyDay: boolean;
  hasHandwrittenScanner: boolean;
  hasFullSyllabus: boolean;
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
    photoScansPerMonth: 0,
    voiceMinutesPerMonth: 0,
    hasAi: false,
    hasDictateMyDay: false,
    hasHandwrittenScanner: false,
    hasFullSyllabus: false,
    maxTasksPerDay: 10,
    tagline: "Get organized",
    benefits: [
      "Daily planner & task manager",
      "Basic syllabus tracking",
      "Calendar & consistency tracker",
      "Up to 10 tasks per day",
      "Meditation & habits",
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
    photoScansPerMonth: 20,
    voiceMinutesPerMonth: 40,
    hasAi: true,
    hasDictateMyDay: true,
    hasHandwrittenScanner: true,
    hasFullSyllabus: true,
    maxTasksPerDay: null,
    tagline: "Most popular",
    benefits: [
      "Everything in Basic",
      "Dictate My Day (voice planning)",
      "Handwritten planner scanner",
      "20 photo scans / month",
      "40 voice minutes / month",
      "Full syllabus & marks engine",
      "Unlimited tasks per day",
    ],
  },
  pro_max: {
    id: "pro_max",
    name: "Pro Max",
    monthlyPricePaise: 49900,
    monthlyPriceDisplay: "₹499",
    trialPricePaise: 2900,
    trialPriceDisplay: "₹29",
    trialDays: 3,
    photoScansPerMonth: 50,
    voiceMinutesPerMonth: 80,
    hasAi: true,
    hasDictateMyDay: true,
    hasHandwrittenScanner: true,
    hasFullSyllabus: true,
    maxTasksPerDay: null,
    tagline: "Maximum power",
    benefits: [
      "Everything in Pro",
      "50 photo scans / month",
      "80 voice minutes / month",
      "Priority support",
    ],
  },
};

export const TIER_ORDER: SubscriptionTier[] = ["basic", "pro", "pro_max"];

export const DEFAULT_TIER: SubscriptionTier = "pro";

export function getTierConfig(tier: string | null | undefined): TierConfig {
  if (tier === "basic" || tier === "pro" || tier === "pro_max") {
    return TIERS[tier];
  }
  return TIERS.pro;
}

export function canUseAi(tier: string | null | undefined): boolean {
  return getTierConfig(tier).hasAi;
}

export function getPhotoScansLimit(tier: string | null | undefined): number {
  return getTierConfig(tier).photoScansPerMonth;
}

export function getVoiceMinutesLimit(tier: string | null | undefined): number {
  return getTierConfig(tier).voiceMinutesPerMonth;
}

export function remainingPhotoScans(
  tier: string | null | undefined,
  used: number,
  bonus: number,
): number {
  const limit = getPhotoScansLimit(tier);
  return Math.max(0, limit + bonus - used);
}

export function remainingVoiceMinutes(
  tier: string | null | undefined,
  used: number,
  bonus: number,
): number {
  const limit = getVoiceMinutesLimit(tier);
  return Math.max(0, limit + bonus - used);
}

export const EXTRA_CREDITS = {
  photoScans25: {
    id: "photo_scans_25",
    label: "+25 Photo Scans",
    amount: 25,
    pricePaise: 4900,
    priceDisplay: "₹49",
    type: "photo_scans" as const,
  },
  voiceMinutes50: {
    id: "voice_minutes_50",
    label: "+50 Voice Minutes",
    amount: 50,
    pricePaise: 7900,
    priceDisplay: "₹79",
    type: "voice_minutes" as const,
  },
};
