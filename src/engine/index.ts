/**
 * Engine public API — domain-agnostic execution engine.
 *
 * Consumers (verticals, apps) import from here / @engine/*. The engine NEVER imports
 * vertical configs, src/content/**, or exam-specific modules (enforced by ESLint).
 */

// Provider interfaces (PROVIDER_LLM / PROVIDER_STT / PROVIDER_CRM)
export type {
  LlmMessage,
  LlmChatOptions,
  LlmChatResult,
  LlmProvider,
  SttTranscribeInput,
  SttTranscribeResult,
  SttProvider,
  Deal,
  DealStage,
  CrmActivity,
  CrmProvider,
} from "./providers";

// KnowledgeTree model + repository contract
export type {
  MasteryStatus,
  KnowledgeLeaf,
  KnowledgeBranch,
  KnowledgeTree,
  KnowledgeTreeRepository,
} from "./models/knowledgeTree";
export { normalizeMasteryStatus } from "./models/knowledgeTree";

// GapPlanner + OutcomeMetric projection
export type {
  OutcomeBranchLike,
  OutcomeProjection,
  OutcomeTargetRange,
  GapThresholdMode,
  PickUntilThresholdResult,
} from "./planning/gapPlanner";
export {
  projectOutcomeLinear,
  outcomeTargetRange,
  sortByPayoff,
  pickUntilThreshold,
  groupSplitWeights,
  gapThresholdForMode,
} from "./planning/gapPlanner";
