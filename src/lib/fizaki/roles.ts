/**
 * FIZAKI roles: Rep (self), Manager (their team), Admin (content + org).
 * Mapped from the shared `user_organization_memberships.role` column (which now allows
 * 'rep' and 'manager' after the vertical migration).
 */
export type FizakiRole = "rep" | "manager" | "admin";

export const FIZAKI_ROLES: readonly FizakiRole[] = ["rep", "manager", "admin"];

export function isFizakiRole(value: unknown): value is FizakiRole {
  return value === "rep" || value === "manager" || value === "admin";
}

/** Normalize a membership role to a FIZAKI role; non-FIZAKI roles default to rep. */
export function toFizakiRole(membershipRole: string | null | undefined): FizakiRole {
  if (membershipRole === "manager") return "manager";
  if (membershipRole === "admin") return "admin";
  return "rep";
}
