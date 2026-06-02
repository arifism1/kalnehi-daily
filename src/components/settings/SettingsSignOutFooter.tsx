"use client";

import { LogOut } from "lucide-react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { KalSpinner } from "@/components/loading/KalSpinner";
import { KalnehiMark } from "@/components/KalnehiMark";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SITE_NAME } from "@/lib/seo-metadata";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

function LogoutFarewellScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-kal-page px-8 text-center">
      <KalnehiMark className="h-8 w-auto opacity-70" />
      <div className="space-y-2">
        <p className="font-serif text-2xl font-normal leading-snug text-kal-text">
          do good in life,
          <br />
          don&apos;t forget me hero!
        </p>
        <p className="text-sm text-kal-muted">Signing you out…</p>
      </div>
      <KalSpinner size="lg" />
    </div>
  );
}

/**
 * Sign out footer — shown at the bottom of Profile and Settings session sections.
 */
export function SettingsSignOutFooter() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setSignOutConfirmOpen(false);
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await Promise.all([
        supabase.auth.signOut(),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      useAuthStore.getState().setAuth(null);
    }
    router.replace("/auth");
  }, [router]);

  if (!user) {
    return null;
  }

  return (
    <>
      {signingOut && <LogoutFarewellScreen />}
      <ConfirmDialog
        open={signOutConfirmOpen}
        title="Sign out?"
        description={`You will be logged out of ${SITE_NAME}.`}
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        danger
        onCancel={() => setSignOutConfirmOpen(false)}
        onConfirm={() => void signOut()}
      />

      <nav aria-label="Session">
        <button
          type="button"
          onClick={() => setSignOutConfirmOpen(true)}
          className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] py-3.5 text-[15px] font-semibold text-[var(--kal-danger-text)] active:opacity-90"
        >
          <LogOut className="size-5" />
          Sign out
        </button>
      </nav>
    </>
  );
}
