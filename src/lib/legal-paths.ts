/** Policy and legal pages — may be viewed without signing in (SEO + footer links). */
export const LEGAL_PATHS = new Set<string>([
  "/privacy",
  "/terms",
  "/refund",
  "/return",
  "/shipping",
  "/policies",
  "/about",
  "/account-deletion",
  "/dpdp-rights",
]);

export function isLegalPath(pathname: string): boolean {
  return LEGAL_PATHS.has(pathname);
}
