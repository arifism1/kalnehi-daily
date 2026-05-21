"use client";

import type { UserIdentity } from "@supabase/supabase-js";
import clsx from "clsx";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { buildAuthCallbackUrl } from "@/lib/authCallbackUrl";
import { formatSupabaseError, getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

function providerLabel(provider: string): string {
  if (provider === "google") return "Google";
  if (provider === "email") return "Email & password";
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

  const [identities, setIdentities] = useState<UserIdentity[] | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
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

  const hasEmail = useMemo(
    () => (identities ?? []).some((i) => i.provider === "email"),
    [identities],
  );
  const hasGoogle = useMemo(
    () => (identities ?? []).some((i) => i.provider === "google"),
    [identities],
  );

  const submitPassword = useCallback(async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    const pw = newPassword;
    const confirm = confirmPassword;
    if (pw.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (pw !== confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    const wasEmailLinkedBeforeSubmit = hasEmail;
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: upd, error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      if (upd.user?.identities?.length) {
        setIdentities(upd.user.identities);
      }
      await supabase.auth.refreshSession();
      const { data: fresh } = await supabase.auth.getUser();
      if (fresh.user) {
        setIdentities(fresh.user.identities ?? []);
      } else {
        await refreshIdentities();
      }
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        wasEmailLinkedBeforeSubmit
          ? "Password updated."
          : "Password set — you can sign in with email next time.",
      );
    } catch (e) {
      setPasswordError(formatSupabaseError(e));
    } finally {
      setPasswordBusy(false);
    }
  }, [confirmPassword, hasEmail, newPassword, refreshIdentities]);

  const linkGoogle = useCallback(async () => {
    setLinkError(null);
    setLinkBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl("/settings#login-methods"),
        },
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

      {!hasGoogle ? (
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

      {!hasEmail ? (
        <div className="border-t border-kal-border px-4 py-3">
          <p className="mb-3 text-xs leading-relaxed text-kal-text-secondary">
            Add a password to sign in with email if you lose access to Google. Your account
            and email stay the same.
          </p>
          {passwordError ? (
            <p className="mb-2 rounded-xl border border-kal-danger-border bg-kal-danger-soft px-3 py-2 text-sm text-kal-danger-text">
              {passwordError}
            </p>
          ) : null}
          {passwordSuccess ? (
            <p
              className="mb-2 text-sm font-medium text-kal-accent"
              role="status"
            >
              {passwordSuccess}
            </p>
          ) : null}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="login-methods-new-password"
                className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary"
              >
                <Lock className="size-3.5" aria-hidden />
                New password
              </label>
              <input
                id="login-methods-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label
                htmlFor="login-methods-confirm-password"
                className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary"
              >
                <Lock className="size-3.5" aria-hidden />
                Confirm password
              </label>
              <input
                id="login-methods-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                placeholder="Repeat password"
              />
            </div>
            <button
              type="button"
              disabled={passwordBusy}
              onClick={() => void submitPassword()}
              className="kal-btn-accent flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl disabled:opacity-50"
            >
              {passwordBusy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Set password for email login
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-kal-border px-4 py-2">
          <details className="group rounded-xl py-2">
            <summary className="cursor-pointer list-none text-sm font-semibold text-kal-accent marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="underline-offset-2 group-open:underline">Change password</span>
            </summary>
            <div className="mt-3 space-y-3 border-t border-kal-border pt-3">
              {passwordError ? (
                <p className="rounded-xl border border-kal-danger-border bg-kal-danger-soft px-3 py-2 text-sm text-kal-danger-text">
                  {passwordError}
                </p>
              ) : null}
              {passwordSuccess ? (
                <p className="text-sm font-medium text-kal-accent" role="status">
                  {passwordSuccess}
                </p>
              ) : null}
              <div>
                <label
                  htmlFor="login-methods-change-new"
                  className="text-xs font-semibold text-kal-text-secondary"
                >
                  New password
                </label>
                <input
                  id="login-methods-change-new"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                />
              </div>
              <div>
                <label
                  htmlFor="login-methods-change-confirm"
                  className="text-xs font-semibold text-kal-text-secondary"
                >
                  Confirm password
                </label>
                <input
                  id="login-methods-change-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                />
              </div>
              <button
                type="button"
                disabled={passwordBusy}
                onClick={() => void submitPassword()}
                className="kal-btn-accent flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm disabled:opacity-50"
              >
                {passwordBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                Update password
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
