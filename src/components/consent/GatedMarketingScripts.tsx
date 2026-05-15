"use client";

import { Suspense } from "react";
import { useMemo, useSyncExternalStore } from "react";

import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import {
  GoogleTagManagerHead,
  GoogleTagManagerNoScript,
} from "@/components/GoogleTagManager";
import {
  MetaPixelNoScript,
  MetaPixelRouteTracker,
  MetaPixelScript,
} from "@/components/MetaPixel";
import {
  getCookieConsentRaw,
  parseConsentRecord,
  subscribeCookieConsent,
} from "@/lib/cookieConsent";

/**
 * Loads third-party marketing/analytics tags only after an explicit consent record exists.
 * Essential auth cookies are unaffected (Supabase).
 */
export function GatedMarketingScripts() {
  const raw = useSyncExternalStore(
    subscribeCookieConsent,
    getCookieConsentRaw,
    () => null,
  );
  const consentRecord = useMemo(() => parseConsentRecord(raw), [raw]);

  if (!consentRecord) return null;

  return (
    <>
      {consentRecord.analytics ? (
        <>
          <GoogleTagManagerNoScript />
          <GoogleTagManagerHead marketingConsent={consentRecord.marketing} />
          <GoogleAnalytics marketingConsent={consentRecord.marketing} />
        </>
      ) : null}
      {consentRecord.marketing ? (
        <>
          <MetaPixelNoScript />
          <MetaPixelScript />
          <Suspense fallback={null}>
            <MetaPixelRouteTracker />
          </Suspense>
        </>
      ) : null}
    </>
  );
}
