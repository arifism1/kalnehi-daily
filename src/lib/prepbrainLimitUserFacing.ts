import {
  prepbrainLimitReachedMessage,
  PREPBRAIN_LIMIT_MESSAGE_MONTHLY,
  type AiUsagePhase,
} from "@/lib/prepbrainTokens";

/** Monthly cap copy without naming deprecated UI surfaces (see `PREPBRAIN_LIMIT_MESSAGE_MONTHLY`). */
const PREPBRAIN_LIMIT_MESSAGE_MONTHLY_UI =
  "You have reached your monthly AI limit of 2 million tokens (PrepBrain). It will reset on the 1st of next month.";

export function prepbrainLimitReachedMessageForUi(phase: AiUsagePhase): string {
  const raw = prepbrainLimitReachedMessage(phase);
  if (raw === PREPBRAIN_LIMIT_MESSAGE_MONTHLY) return PREPBRAIN_LIMIT_MESSAGE_MONTHLY_UI;
  return raw;
}
