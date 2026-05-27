"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Immediate sign-out for paywall/lockout contexts — no confirm dialog or farewell delay.
 */
export function useAppSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      useAuthStore.getState().setAuth(null);
    }
    router.replace("/auth");
  }, [router]);

  return { signOut, signingOut };
}
