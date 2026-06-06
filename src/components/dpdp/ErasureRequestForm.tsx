"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DPDP_RIGHTS_SLA_DAYS } from "@/lib/dpdp/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export function ErasureRequestForm() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [erasureConfirm, setErasureConfirm] = useState(false);

  const loadSession = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setSignedIn(!!user);
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const submitErasure = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/dpdp/rights-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "erasure" }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        referenceId?: string;
      };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not submit request.");
      }
      setSuccess(
        `Deletion request submitted. Reference: ${payload.referenceId}. We will review and delete your account after verification — typically within 30 days, and no later than ${DPDP_RIGHTS_SLA_DAYS} days.`,
      );
      setErasureConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (signedIn === null) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-6 animate-spin text-kal-muted" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-kal-text-secondary">
          Sign in to submit an account deletion request from this page, or use the
          email option below.
        </p>
        <Link
          href="/auth?next=/account-deletion"
          className="kal-btn-accent inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Sign in to request deletion
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(error || success) && (
        <p
          className={clsx(
            "rounded-xl border px-3 py-2 text-sm",
            error
              ? "border-kal-danger-border bg-kal-danger-soft text-kal-danger-text"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          )}
        >
          {error ?? success}
        </p>
      )}
      <p className="text-sm text-kal-text-secondary">
        Submit a verified deletion request. Our team will review it and delete your
        account after confirming your identity and subscription status. Deletion is
        not instant.
      </p>
      <label className="flex items-start gap-2 text-sm text-kal-text">
        <input
          type="checkbox"
          checked={erasureConfirm}
          onChange={(e) => setErasureConfirm(e.target.checked)}
          className="mt-1 size-4 accent-kal-accent"
        />
        I understand this submits a request for permanent deletion after admin
        verification — not immediate deletion.
      </label>
      <button
        type="button"
        disabled={busy || !erasureConfirm || !!success}
        onClick={() => void submitErasure()}
        className="rounded-xl border border-kal-danger-border bg-kal-danger-soft px-4 py-2.5 text-sm font-semibold text-kal-danger-text disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit account deletion request"}
      </button>
    </div>
  );
}
