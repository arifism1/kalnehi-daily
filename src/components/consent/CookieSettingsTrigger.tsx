"use client";

import { useCookieConsent } from "@/components/consent/cookieConsentContext";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

/** Button styled as inline text — use in footers and settings. */
export function CookieSettingsTrigger({
  className = "font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90",
  children = "Cookie settings",
}: Props) {
  const { openSettings } = useCookieConsent();
  return (
    <button type="button" className={className} onClick={openSettings}>
      {children}
    </button>
  );
}
