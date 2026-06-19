/**
 * Engine provider interfaces (PROVIDER_LLM / PROVIDER_STT / PROVIDER_CRM).
 * Pure contracts only — no concrete implementations and no app imports.
 */
export type {
  LlmMessage,
  LlmChatOptions,
  LlmChatResult,
  LlmProvider,
} from "./llm";
export type {
  SttTranscribeInput,
  SttTranscribeResult,
  SttProvider,
} from "./stt";
export type {
  Deal,
  DealStage,
  CrmActivity,
  CrmProvider,
} from "./crm";
