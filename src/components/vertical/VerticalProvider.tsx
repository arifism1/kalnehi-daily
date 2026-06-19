"use client";

/**
 * Client-side vertical context. The resolved VerticalConfig is computed on the server
 * (via getServerVertical) and passed down once, so the client never re-resolves the host.
 *
 * Usage:
 *   const { config } = useVertical();
 *   const treeLabel = useCopy("knowledgeTreeLabel"); // "Syllabus" | "Playbook"
 *
 * NOT YET mounted in the Kalnehi layout — wired in during the Kalnehi refactor phase so
 * copy lookups replace hard-coded student wording with zero behavior change verified by
 * the golden master + branding tests.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { copy, type CopyPack, type VerticalConfig } from "@/verticals";

interface VerticalContextValue {
  config: VerticalConfig;
}

const VerticalContext = createContext<VerticalContextValue | null>(null);

export function VerticalProvider({
  config,
  children,
}: {
  config: VerticalConfig;
  children: ReactNode;
}) {
  const value = useMemo<VerticalContextValue>(() => ({ config }), [config]);
  return (
    <VerticalContext.Provider value={value}>
      {children}
    </VerticalContext.Provider>
  );
}

export function useVertical(): VerticalContextValue {
  const ctx = useContext(VerticalContext);
  if (!ctx) {
    throw new Error("useVertical must be used within a VerticalProvider");
  }
  return ctx;
}

/** Copy lookup hook. `useCopy("coachName")` -> "Mastermind" | "FIZAKI Coach". */
export function useCopy<K extends keyof CopyPack>(key: K): CopyPack[K] {
  const { config } = useVertical();
  return copy(config, key);
}
