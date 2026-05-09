"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { getStoredReferral, isInstagramReferral } from "@/lib/referral-capture";
import { useAuthStore } from "@/store/useAuthStore";

const DISMISSED_KEY = "kalnehi_ig_banner_dismissed";

/**
 * Shows a warm welcome banner for users who arrived from an Instagram/ManyChat
 * magic link. Only visible before the user signs in. Dismissable via the X button.
 */
export function InstagramWelcomeBanner() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const [visible, setVisible] = useState(false);
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return; // wait until auth state is known
    if (user) return; // already signed in — don't show
    try {
      if (sessionStorage.getItem(DISMISSED_KEY)) return;
      if (!isInstagramReferral()) return;
      const stored = getStoredReferral();
      setRef(stored.ref);
      setVisible(true);
    } catch {
      // Private browsing — ignore.
    }
  }, [user, initialized]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Ignore.
    }
  }

  return (
    <div
      role="status"
      className="w-full max-w-md rounded-xl border border-kal-accent/30 bg-kal-accent/[0.06] py-3 pl-4 pr-3"
      style={{ borderLeftWidth: "3px", borderLeftColor: "var(--color-kal-accent, #FF7A00)" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-kal-text leading-snug">
            Welcome from Instagram
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-kal-text-secondary">
            Sign up to claim your 7-day free trial.
            {ref ? (
              <span className="ml-1 font-medium text-kal-accent">
                Code: {ref}
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="mt-0.5 shrink-0 rounded-md p-0.5 text-kal-muted transition-colors hover:text-kal-text"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
