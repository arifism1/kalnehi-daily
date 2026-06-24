/**
 * Vertical registry + pure helpers. Safe to import anywhere EXCEPT `src/engine/**`
 * (the engine must stay domain-agnostic; the ESLint boundary enforces this).
 */
import { kalnehiConfig } from "./kalnehi.config";
import type { CopyPack, FeatureId, VerticalConfig, VerticalId } from "./types";

export type {
  CopyPack,
  FeatureId,
  VerticalBrand,
  VerticalConfig,
  VerticalId,
  VerticalRole,
  VerticalTheme,
} from "./types";

export const VERTICALS: Record<VerticalId, VerticalConfig> = {
  kalnehi: kalnehiConfig,
};

export const DEFAULT_VERTICAL_ID: VerticalId = "kalnehi";

export const ALL_VERTICAL_IDS: readonly VerticalId[] = ["kalnehi"];

export function isVerticalId(value: unknown): value is VerticalId {
  return value === "kalnehi";
}

export function getVerticalConfig(id: VerticalId): VerticalConfig {
  return VERTICALS[id];
}

/** Copy lookup. `t(config, "knowledgeTreeLabel")` -> "Syllabus". */
export function copy<K extends keyof CopyPack>(
  config: VerticalConfig,
  key: K,
): CopyPack[K] {
  return config.copy[key];
}

/** Feature flag lookup. Defaults to OFF for unknown ids. */
export function isFeatureEnabled(
  config: VerticalConfig,
  feature: FeatureId,
): boolean {
  return config.features[feature] === true;
}
