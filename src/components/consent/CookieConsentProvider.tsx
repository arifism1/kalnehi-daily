"use client";

import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import {
  CookieConsentContextProvider,
  useCookieConsent,
} from "@/components/consent/cookieConsentContext";
import { GatedMarketingScripts } from "@/components/consent/GatedMarketingScripts";

function CookieConsentBannerGate() {
  const { settingsBannerKey } = useCookieConsent();
  return <CookieConsentBanner key={settingsBannerKey} />;
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentContextProvider>
      <GatedMarketingScripts />
      {children}
      <CookieConsentBannerGate />
    </CookieConsentContextProvider>
  );
}
