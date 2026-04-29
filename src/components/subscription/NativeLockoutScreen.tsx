"use client";

/**
 * Shown when the welcome trial ended without a paid plan inside the Capacitor
 * Android shell — no checkout or external subscribe links (Play policy).
 */
export function NativeLockoutScreen() {
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-kal-page p-6">
      <div className="kal-glass-panel mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl px-8 py-10 text-center shadow-lg">
        <p className="text-sm font-medium leading-relaxed text-kal-text">
          Your trial has concluded. Please check your registered WhatsApp or Email for account
          activation instructions.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="kal-btn-accent min-h-[48px] w-full max-w-xs"
        >
          Refresh status
        </button>
      </div>
    </div>
  );
}
