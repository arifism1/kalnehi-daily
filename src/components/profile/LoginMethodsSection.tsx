"use client";

import type { UserIdentity } from "@supabase/supabase-js";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { buildAuthCallbackUrl } from "@/lib/authCallbackUrl";
import { useNativeOAuthBrowserDismiss } from "@/hooks/useNativeOAuthBrowserDismiss";
import {
  isNativeKalnehiShell,
  startNativeSupabaseOAuthFlow,
} from "@/lib/nativeSupabaseOAuth";
import { formatSupabaseError, getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

function providerLabel(provider: string): string {
  if (provider === "google") return "Google";
  if (provider === "email") return "Email";
  return provider.replace(/_/g, " ");
}

function rowClassName(extra?: string) {
  return clsx(
    "flex min-h-[52px] items-center gap-3 border-b border-kal-border px-4 py-3 last:border-b-0",
    extra,
  );
}

export function LoginMethodsSection() {
  const user = useAuthStore((s) => s.user);
  const isNativeApp = isNativeKalnehiShell();

  const [identities, setIdentities] = useState<UserIdentity[] | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const refreshIdentities = useCallback(async () => {
    if (!user) {
      setIdentities(null);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { data: gu, error: guErr } = await supabase.auth.getUser();
    if (!guErr && gu.user) {
      setIdentities(gu.user.identities ?? []);
      return;
    }
    const { data: idData, error: idErr } = await supabase.auth.getUserIdentities();
    if (!idErr && idData?.identities) {
      setIdentities(idData.identities);
      return;
    }
    setIdentities(useAuthStore.getState().user?.identities ?? []);
  }, [user]);

  useEffect(() => {
    void refreshIdentities();
  }, [refreshIdentities]);

  const hasGoogle = useMemo(
    () => (identities ?? []).some((i) => i.provider === "google"),
    [identities],
  );

  const clearLinkBusy = useCallback(() => {
    setLinkBusy(false);
  }, []);

  useNativeOAuthBrowserDismiss(clearLinkBusy, linkBusy);

  const linkGoogle = useCallback(async () => {
    setLinkError(null);
    setLinkBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = buildAuthCallbackUrl("/settings#login-methods");

      if (isNativeKalnehiShell()) {
        await startNativeSupabaseOAuthFlow(() =>
          supabase.auth.linkIdentity({
            provider: "google",
            options: { redirectTo, skipBrowserRedirect: true },
          }),
        );
        return;
      }

      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (e) {
      setLinkError(formatSupabaseError(e));
      setLinkBusy(false);
    }
  }, []);

  if (!user) return null;

  if (identities === null) {
    return (
      <div className={rowClassName("justify-center py-8")}>
        <Loader2 className="size-6 animate-spin text-kal-accent" aria-hidden />
        <span className="text-sm text-kal-muted">Loading sign-in methods…</span>
      </div>
    );
  }

  const sorted = [...identities].toSorted((a, b) =>
    providerLabel(a.provider).localeCompare(providerLabel(b.provider)),
  );

  return (
    <div>
      {sorted.length === 0 ? (
        <div className={rowClassName()}>
          <p className="text-sm text-kal-text-secondary">No linked sign-in methods found.</p>
        </div>
      ) : (
        sorted.map((identity, index) => (
          <div
            key={identity.identity_id ?? `${identity.provider}-${String(index)}`}
            className={rowClassName()}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-kal-muted">
                Connected
              </span>
              <span className="text-sm font-medium text-kal-text">
                {providerLabel(identity.provider)}
              </span>
            </div>
          </div>
        ))
      )}

      {!isNativeApp && !hasGoogle ? (
        <div className="border-t border-kal-border px-4 py-3">
          {linkError ? (
            <p className="mb-2 rounded-xl border border-kal-danger-border bg-kal-danger-soft px-3 py-2 text-sm text-kal-danger-text">
              {linkError}
            </p>
          ) : null}
          <p className="mb-2 text-xs text-kal-text-secondary">
            Use the same Google account as <span className="font-medium text-kal-text">{user.email}</span>{" "}
            if possible, so you don&apos;t end up with two accounts.
          </p>
          <button
            type="button"
            disabled={linkBusy}
            onClick={() => void linkGoogle()}
            className="kal-glass-subtle flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-kal-text transition-colors hover:opacity-95 disabled:opacity-50"
          >
            {linkBusy ? <Loader2 className="size-5 animate-spin" /> : null}
            Link Google
          </button>
        </div>
      ) : null}
    </div>
  );
}
