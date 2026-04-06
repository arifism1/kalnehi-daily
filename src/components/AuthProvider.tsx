"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";

import {
  getSupabaseBrowserClient,
  migrateLegacyLocalStorageSession,
} from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const supabase = getSupabaseBrowserClient();

      const apply = (session: Session | null) => {
        setAuth(session);
      };

      void (async () => {
        try {
          await migrateLegacyLocalStorageSession(supabase);
          const {
            data: { session },
          } = await supabase.auth.getSession();
          apply(session);
        } finally {
          setInitialized(true);
        }
      })();

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        apply(session);
      });
      subscription = data.subscription;
    } catch {
      setInitialized(true);
    }

    return () => subscription?.unsubscribe();
  }, [setAuth, setInitialized]);

  return <>{children}</>;
}
