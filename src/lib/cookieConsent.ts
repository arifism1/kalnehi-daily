/**
 * Browser cookie / marketing consent preferences (GDPR-style transparency in UI).
 * Persisted in localStorage with a first-party cookie mirror; does not replace
 * sign-in session cookies.
 */

export const COOKIE_CONSENT_STORAGE_KEY = "kalnehi_cookie_consent_v1";

const CONSENT_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

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

function readConsentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${COOKIE_CONSENT_STORAGE_KEY}=`;
  const cookies = document.cookie.split("; ");
  for (const part of cookies) {
    if (part.startsWith(prefix)) {
      try {
        return decodeURIComponent(part.slice(prefix.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function writeConsentCookie(serialized: string): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  const encoded = encodeURIComponent(serialized);
  let cookie = `${COOKIE_CONSENT_STORAGE_KEY}=${encoded}; Path=/; Max-Age=${CONSENT_COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
  if (secure) cookie += "; Secure";
  document.cookie = cookie;
}

function writeLocalStorage(serialized: string): boolean {
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

function readLocalStorage(): string | null {
  try {
    return localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function notifyConsentChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kalnehi-cookie-consent-changed"));
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
  const serialized = JSON.stringify(record);
  writeLocalStorage(serialized);
  try {
    writeConsentCookie(serialized);
  } catch {
    /* ignore */
  }
  notifyConsentChanged();
  return record;
}

export function getCookieConsentRaw(): string | null {
  if (typeof window === "undefined") return null;

  const fromLocal = readLocalStorage();
  if (fromLocal && parseConsentRecord(fromLocal)) return fromLocal;

  const fromCookie = readConsentCookie();
  if (!fromCookie || !parseConsentRecord(fromCookie)) return fromLocal ?? null;

  // Backfill localStorage when cookie survived a local clear.
  writeLocalStorage(fromCookie);
  return fromCookie;
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
