"use client";

import Link from "next/link";
import { useState } from "react";

import { useCookieConsent } from "@/components/consent/cookieConsentContext";

const privacyLinkClass =
  "font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90";

const primaryButtonClass =
  "min-h-10 rounded-md bg-kal-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:rounded-lg sm:py-2.5";

const secondaryButtonClass =
  "min-h-10 rounded-md border border-kal-border bg-kal-page px-4 py-2 text-xs font-medium text-kal-text sm:rounded-lg sm:py-2.5 sm:text-sm";

const accentOutlineButtonClass =
  "min-h-10 rounded-md border border-kal-border bg-transparent px-4 py-2 text-xs font-medium text-kal-accent sm:rounded-lg sm:py-2.5 sm:text-sm";

/**
 * First-visit banner + “Cookie settings” panel. Fixed to bottom; does not block
 * essential app use (tap outside continues; buttons persist choice).
 */
export function CookieConsentBanner() {
  const {
    consentRecord,
    consentHydrated,
    settingsOpen,
    closeSettings,
    acceptAll,
    essentialOnly,
    saveCustom,
  } = useCookieConsent();

  const [customOpen, setCustomOpen] = useState(false);
  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const [draftMarketing, setDraftMarketing] = useState(false);

  const visible =
    consentHydrated && (consentRecord === null || settingsOpen);

  function startCustomize() {
    setCustomOpen(true);
    setDraftAnalytics(consentRecord?.analytics ?? false);
    setDraftMarketing(consentRecord?.marketing ?? false);
  }

  function onSaveCustom() {
    saveCustom(draftAnalytics, draftMarketing);
    setCustomOpen(false);
  }

  if (!visible) return null;

  const title =
    settingsOpen && consentRecord
      ? "Cookie preferences"
      : "Cookies and privacy";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-kal-border bg-kal-card/95 p-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-md sm:p-4 sm:px-6"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:gap-3">
        <div>
          <h2
            id="cookie-banner-title"
            className="text-base font-semibold text-kal-text"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm leading-snug text-kal-text-secondary sm:mt-2 sm:leading-relaxed">
            <span className="sm:hidden">
              Optional analytics and marketing cookies. Essential cookies always
              run. See our{" "}
              <Link href="/privacy" className={privacyLinkClass}>
                Privacy Policy
              </Link>
              .
            </span>
            <span className="hidden sm:inline">
              We use optional analytics and marketing tools to understand traffic
              and measure ads. Essential cookies are required for sign-in and core
              features. See our{" "}
              <Link href="/privacy" className={privacyLinkClass}>
                Privacy Policy
              </Link>{" "}
              for details.
            </span>
          </p>
        </div>

        {customOpen ? (
          <div className="space-y-2 rounded-xl border border-kal-border bg-kal-page/80 p-2.5 sm:space-y-3 sm:p-4">
            <label htmlFor="cookie-analytics" aria-label="Analytics cookies" className="flex cursor-pointer items-start gap-3 text-sm text-kal-text">
              <input
                id="cookie-analytics"
                type="checkbox"
                className="mt-1 size-4 rounded border-kal-border text-kal-accent"
                checked={draftAnalytics}
                onChange={(e) => setDraftAnalytics(e.target.checked)}
              />
              <span>
                <span className="font-medium">Analytics</span>
                <span className="mt-0.5 block text-kal-text-secondary">
                  Google Analytics and Google Tag Manager (usage insights).
                </span>
              </span>
            </label>
            <label htmlFor="cookie-marketing" aria-label="Marketing cookies" className="flex cursor-pointer items-start gap-3 text-sm text-kal-text">
              <input
                id="cookie-marketing"
                type="checkbox"
                className="mt-1 size-4 rounded border-kal-border text-kal-accent"
                checked={draftMarketing}
                onChange={(e) => setDraftMarketing(e.target.checked)}
              />
              <span>
                <span className="font-medium">Marketing</span>
                <span className="mt-0.5 block text-kal-text-secondary">
                  Meta Pixel (ad measurement and remarketing).
                </span>
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5 pt-0.5 sm:gap-2 sm:pt-1">
              <button
                type="button"
                className={primaryButtonClass}
                onClick={onSaveCustom}
              >
                Save choices
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setCustomOpen(false)}
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              onClick={acceptAll}
            >
              Accept all
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={essentialOnly}
            >
              Reject non-essential
            </button>
            <button
              type="button"
              className={accentOutlineButtonClass}
              onClick={startCustomize}
            >
              Customize
            </button>
            {settingsOpen && consentRecord !== null ? (
              <button
                type="button"
                className="min-h-10 rounded-md px-4 py-2 text-xs font-medium text-kal-muted underline-offset-2 hover:underline sm:rounded-lg sm:py-2.5 sm:text-sm"
                onClick={closeSettings}
              >
                Close
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
