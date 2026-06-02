"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getCookieConsentRaw,
  parseConsentRecord,
  persistConsentRecord,
  subscribeCookieConsent,
} from "@/lib/cookieConsent";

type CookieConsentContextValue = {
  consentRecord: ReturnType<typeof parseConsentRecord>;
  /** True after mount so the banner can read localStorage/cookies (avoids SSR flash). */
  consentHydrated: boolean;
  settingsOpen: boolean;
  settingsBannerKey: number;
  openSettings: () => void;
  closeSettings: () => void;
  acceptAll: () => void;
  essentialOnly: () => void;
  saveCustom: (analytics: boolean, marketing: boolean) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

export function CookieConsentContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = useSyncExternalStore(
    subscribeCookieConsent,
    getCookieConsentRaw,
    () => null,
  );

  const consentRecord = useMemo(() => parseConsentRecord(raw), [raw]);

  const [consentHydrated, setConsentHydrated] = useState(false);
  useEffect(() => {
    setConsentHydrated(true);
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsBannerKey, setSettingsBannerKey] = useState(0);

  const openSettings = useCallback(() => {
    setSettingsBannerKey((k) => k + 1);
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const acceptAll = useCallback(() => {
    persistConsentRecord(true, true);
    setSettingsOpen(false);
  }, []);

  const essentialOnly = useCallback(() => {
    persistConsentRecord(false, false);
    setSettingsOpen(false);
  }, []);

  const saveCustom = useCallback((analytics: boolean, marketing: boolean) => {
    persistConsentRecord(analytics, marketing);
    setSettingsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      consentRecord,
      consentHydrated,
      settingsOpen,
      settingsBannerKey,
      openSettings,
      closeSettings,
      acceptAll,
      essentialOnly,
      saveCustom,
    }),
    [
      consentRecord,
      consentHydrated,
      settingsOpen,
      settingsBannerKey,
      openSettings,
      closeSettings,
      acceptAll,
      essentialOnly,
      saveCustom,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error(
      "useCookieConsent must be used within CookieConsentContextProvider",
    );
  }
  return ctx;
}
