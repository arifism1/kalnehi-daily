"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export function useUserXpProfile(): {
  xp: number;
  level: number;
  loading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_profiles")
        .select("xp, level")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setXp(typeof data.xp === "number" ? data.xp : 0);
        setLevel(typeof data.level === "number" ? data.level : 1);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { xp, level, loading };
}
