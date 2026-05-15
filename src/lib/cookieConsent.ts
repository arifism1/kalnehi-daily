/**
 * Browser cookie / marketing consent preferences (GDPR-style transparency in UI).
 * Stored only on the client; does not replace sign-in session cookies.
 */

export const COOKIE_CONSENT_STORAGE_KEY = "kalnehi_cookie_consent_v1";

export type CookieConsentRecord = {
  v: 1;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export function parseConsentRecord(raw: string | null): CookieConsentRecord | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const rec = o as Partial<CookieConsentRecord>;
    if (rec.v !== 1) return null;
    if (typeof rec.analytics !== "boolean" || typeof rec.marketing !== "boolean")
      return null;
    if (typeof rec.decidedAt !== "string") return null;
    return {
      v: 1,
      analytics: rec.analytics,
      marketing: rec.marketing,
      decidedAt: rec.decidedAt,
    };
  } catch {
    return null;
  }
}

export function persistConsentRecord(
  analytics: boolean,
  marketing: boolean,
): CookieConsentRecord {
  const record: CookieConsentRecord = {
    v: 1,
    analytics,
    marketing,
    decidedAt: new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kalnehi-cookie-consent-changed"));
  }
  return record;
}

export function getCookieConsentRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function subscribeCookieConsent(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener("kalnehi-cookie-consent-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("kalnehi-cookie-consent-changed", handler);
    window.removeEventListener("storage", handler);
  };
}
