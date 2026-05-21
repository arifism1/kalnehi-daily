"use client";

import Link from "next/link";
import { useState } from "react";

import { useCookieConsent } from "@/components/consent/cookieConsentContext";

/**
 * First-visit banner + “Cookie settings” panel. Fixed to bottom; does not block
 * essential app use (tap outside continues; buttons persist choice).
 */
export function CookieConsentBanner() {
  const {
    consentRecord,
    settingsOpen,
    closeSettings,
    acceptAll,
    essentialOnly,
    saveCustom,
  } = useCookieConsent();

  const [customOpen, setCustomOpen] = useState(false);
  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const [draftMarketing, setDraftMarketing] = useState(false);

  const visible = consentRecord === null || settingsOpen;

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
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-kal-border bg-kal-card/95 p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-md sm:px-6"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:gap-4">
        <div>
          <h2
            id="cookie-banner-title"
            className="text-base font-semibold text-kal-text"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
            We use optional analytics and marketing tools to understand traffic
            and measure ads. Essential cookies are required for sign-in and core
            features. See our{" "}
            <Link
              href="/privacy"
              className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
            >
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>

        {customOpen ? (
          <div className="space-y-3 rounded-xl border border-kal-border bg-kal-page/80 p-3 sm:p-4">
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
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className="rounded-lg bg-kal-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                onClick={onSaveCustom}
              >
                Save choices
              </button>
              <button
                type="button"
                className="rounded-lg border border-kal-border bg-kal-page px-4 py-2 text-sm font-medium text-kal-text"
                onClick={() => setCustomOpen(false)}
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              className="rounded-lg bg-kal-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              onClick={acceptAll}
            >
              Accept all
            </button>
            <button
              type="button"
              className="rounded-lg border border-kal-border bg-kal-page px-4 py-2.5 text-sm font-medium text-kal-text"
              onClick={essentialOnly}
            >
              Reject non-essential
            </button>
            <button
              type="button"
              className="rounded-lg border border-kal-border bg-transparent px-4 py-2.5 text-sm font-medium text-kal-accent"
              onClick={startCustomize}
            >
              Customize
            </button>
            {settingsOpen && consentRecord !== null ? (
              <button
                type="button"
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-kal-muted underline-offset-2 hover:underline"
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
