"use client";

import { createContext, useContext } from "react";

import type { StudentOrgSummary } from "@/lib/studentOrgContext";

/**
 * OrgContextProvider — thin React context that carries the student's org
 * summary (name, logo, batch, colours) from the server layout into any client
 * component in the (kalnehi) tree.
 *
 * Value is null for pure B2C users — every consumer must guard on null before
 * rendering org-specific UI.
 */
const OrgContext = createContext<StudentOrgSummary | null>(null);

export function OrgContextProvider({
  value,
  children,
}: {
  value: StudentOrgSummary | null;
  children: React.ReactNode;
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

/**
 * Returns the student's org summary, or null when the student is B2C.
 * Must be called from a client component that is a descendant of OrgContextProvider.
 */
export function useOrgContext(): StudentOrgSummary | null {
  return useContext(OrgContext);
}
