import {
  prepbrainLimitReachedMessage,
  PREPBRAIN_LIMIT_MESSAGE_MONTHLY,
  type AiUsagePhase,
} from "@/lib/prepbrainTokens";

/** Monthly cap copy without naming deprecated UI surfaces (see `PREPBRAIN_LIMIT_MESSAGE_MONTHLY`). */
const PREPBRAIN_LIMIT_MESSAGE_MONTHLY_UI =
  "You have reached your monthly AI limit of 2 million tokens (PrepBrain). It will reset on the 1st of next month.";

const PREPBRAIN_LIMIT_MESSAGE_WELCOME_UI =
  "You've used all 60,000 PrepBrain AI tokens in your 3-day free trial. Upgrade to Smart Plan (₹399/month) for 2 million tokens every month.";

export function prepbrainLimitReachedMessageForUi(phase: AiUsagePhase): string {
  const raw = prepbrainLimitReachedMessage(phase);
  if (raw === PREPBRAIN_LIMIT_MESSAGE_MONTHLY) return PREPBRAIN_LIMIT_MESSAGE_MONTHLY_UI;
  if (phase === "welcome") return PREPBRAIN_LIMIT_MESSAGE_WELCOME_UI;
  return raw;
}
