import type { PrepBrainIntent } from "@/lib/prepbrainIntentRouting";

export type MastermindModelTier = "easy" | "hard";

export type MastermindRoutingReason =
  | "forced"
  | "lexical_edge"
  | "depth"
  | "dump"
  | "sparse"
  | "synth_mass"
  | "med_drill"
  | "default_easy";

/** Telemetry-tunable thresholds — Mastermind hybrid routing */
export const MASTERMIND_TIER_THRESHOLDS = {
  TH_DUMP: 4200,
  TH_SYN: 1400,
  TH_MED: 2000,
  TH_SPARSE: 400,
  D_HARD_TH: 3,
  D_MED_TH: 2,
} as const;

export type MastermindIntentBand = "LOW" | "MED" | "HIGH";

/** Caller passes `effectiveIntent` (excluding small_talk). */
export function mastermindIntentBand(
  intent: Exclude<PrepBrainIntent, "small_talk">,
): MastermindIntentBand {
  switch (intent) {
    case "no_data":
    case "study_camera":
    case "syllabus_progress":
    case "habits_or_meditation":
      return "LOW";
    case "general":
    case "doubt_tracker":
    case "mistake_log":
    case "personal_motivation":
      return "MED";
    default:
      return "HIGH";
  }
}

const LEXICAL_HARD_SUBSTRINGS = [
  "current affairs",
  "cutoff",
  "notification",
  "long term",
  "deep analysis",
  "revision plan",
  "how to plan",
  "next week",
  "this week",
] as const;

const LEXICAL_HARD_REGEXES: readonly RegExp[] = [
  /\bweekly\b/i,
  /\bmonthly\b/i,
  /multi[\s-]?day/i,
  /(study|exam|prep)\s+strategy\b/i,
];

export function mastermindLexicalHardEdge(message: string): boolean {
  const t = message.trim().toLowerCase();
  if (!t) return false;
  for (const s of LEXICAL_HARD_SUBSTRINGS) {
    if (t.includes(s)) return true;
  }
  return LEXICAL_HARD_REGEXES.some((r) => {
    r.lastIndex = 0;
    return r.test(message);
  });
}

function parseForcedTierFromEnv(): MastermindModelTier | null {
  const raw = process.env.MASTERMIND_FORCE_MODEL_TIER?.trim().toLowerCase();
  if (raw === "easy" || raw === "hard") return raw;
  return null;
}

export type ComputeMastermindTierInput = {
  intent: Exclude<PrepBrainIntent, "small_talk">;
  depth: number;
  lastUserContent: string;
  toolDataEstTokens: number;
};

export type MastermindTierResult = {
  tier: MastermindModelTier;
  reasons: MastermindRoutingReason[];
  band: MastermindIntentBand;
};

/**
 * Post-tool routing: Mistral only when gates justify cost.
 * Order: force → lexical → depth → dump → sparse → synth_mass → med_drill → default easy.
 */
export function computeMastermindTier(input: ComputeMastermindTierInput): MastermindTierResult {
  const {
    TH_DUMP,
    TH_SYN,
    TH_MED,
    TH_SPARSE,
    D_HARD_TH,
    D_MED_TH,
  } = MASTERMIND_TIER_THRESHOLDS;

  const band = mastermindIntentBand(input.intent);
  const est = Math.max(0, Math.floor(input.toolDataEstTokens));
  const depth = Math.max(0, Math.floor(input.depth));

  const forced = parseForcedTierFromEnv();
  if (forced) {
    return { tier: forced, reasons: ["forced"], band };
  }

  if (mastermindLexicalHardEdge(input.lastUserContent)) {
    return { tier: "hard", reasons: ["lexical_edge"], band };
  }

  if (depth >= D_HARD_TH) {
    return { tier: "hard", reasons: ["depth"], band };
  }

  if (est >= TH_DUMP) {
    return { tier: "hard", reasons: ["dump"], band };
  }

  if (est <= TH_SPARSE) {
    return { tier: "easy", reasons: ["sparse"], band };
  }

  if (band === "HIGH" && est >= TH_SYN) {
    return { tier: "hard", reasons: ["synth_mass"], band };
  }

  if (band === "MED" && est >= TH_MED && depth >= D_MED_TH) {
    return { tier: "hard", reasons: ["med_drill"], band };
  }

  return { tier: "easy", reasons: ["default_easy"], band };
}
