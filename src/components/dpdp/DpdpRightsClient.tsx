"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  DPDP_RIGHTS_SLA_DAYS,
  GRIEVANCE_OFFICER_EMAIL,
  type DpdpRightsRequestType,
} from "@/lib/dpdp/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type RightsRequestRow = {
  reference_id: string;
  type: DpdpRightsRequestType;
  status: string;
  due_at: string;
  created_at: string;
};

const TYPE_LABELS: Record<DpdpRightsRequestType, string> = {
  access: "Request my data",
  correction: "Correct my data",
  erasure: "Erase my account",
  nomination: "Designate a nominee",
};

export function DpdpRightsClient() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<DpdpRightsRequestType | "withdraw" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<RightsRequestRow[]>([]);
  const [correctionDetails, setCorrectionDetails] = useState("");
  const [nomineeName, setNomineeName] = useState("");
  const [nomineeEmail, setNomineeEmail] = useState("");
  const [erasureConfirm, setErasureConfirm] = useState(false);

  const loadSession = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setSignedIn(!!user);

    if (user) {
      const { data } = await supabase
        .from("dpdp_rights_requests")
        .select("reference_id, type, status, due_at, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setRequests((data as RightsRequestRow[] | null) ?? []);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const submitRequest = async (
    type: DpdpRightsRequestType,
    extra?: Record<string, string>,
  ) => {
    setBusy(type);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/dpdp/rights-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, ...extra }),
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
        `Request submitted. Reference: ${payload.referenceId}. We will respond within ${DPDP_RIGHTS_SLA_DAYS} days.`,
      );
      if (type === "correction") setCorrectionDetails("");
      if (type === "nomination") {
        setNomineeName("");
        setNomineeEmail("");
      }
      if (type === "erasure") setErasureConfirm(false);
      await loadSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const withdrawConsent = async () => {
    setBusy("withdraw");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/dpdp/withdraw-consent", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not withdraw consent.");
      }
      setSuccess(payload.message ?? "Consent withdrawn.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  if (signedIn === null) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-kal-muted" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-kal-border bg-kal-card/40 p-4 text-sm">
        <p>
          Sign in to submit Data Principal rights requests. You can also email{" "}
          <a
            href={`mailto:${GRIEVANCE_OFFICER_EMAIL}`}
            className="font-medium text-kal-accent underline underline-offset-2"
          >
            {GRIEVANCE_OFFICER_EMAIL}
          </a>
          .
        </p>
        <Link
          href="/auth?next=/dpdp-rights"
          className="kal-btn-accent mt-4 inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <section className="space-y-3 rounded-xl border border-kal-border p-4">
        <h2 className="text-base font-semibold text-kal-text">Request my data</h2>
        <p className="text-sm text-kal-text-secondary">
          Obtain a copy of personal data we hold about your account.
        </p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void submitRequest("access")}
          className="kal-glass-subtle min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy === "access" ? "Submitting…" : TYPE_LABELS.access}
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-kal-border p-4">
        <h2 className="text-base font-semibold text-kal-text">Correct my data</h2>
        <textarea
          value={correctionDetails}
          onChange={(e) => setCorrectionDetails(e.target.value)}
          rows={4}
          placeholder="Describe inaccurate or incomplete data and the correction needed."
          className="w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text"
        />
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void submitRequest("correction", { correctionDetails })
          }
          className="kal-glass-subtle min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy === "correction" ? "Submitting…" : TYPE_LABELS.correction}
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-kal-border p-4">
        <h2 className="text-base font-semibold text-kal-text">Erase my account</h2>
        <p className="text-sm text-kal-text-secondary">
          Request deletion of your account and associated personal data. Billing
          records may be retained as required by law. See{" "}
          <Link href="/account-deletion" className="text-kal-accent underline">
            account deletion
          </Link>{" "}
          for details.
        </p>
        <label className="flex items-start gap-2 text-sm text-kal-text">
          <input
            type="checkbox"
            checked={erasureConfirm}
            onChange={(e) => setErasureConfirm(e.target.checked)}
            className="mt-1 size-4 accent-kal-accent"
          />
          I understand this will permanently delete my account data after verification.
        </label>
        <button
          type="button"
          disabled={busy !== null || !erasureConfirm}
          onClick={() => void submitRequest("erasure")}
          className="rounded-xl border border-kal-danger-border bg-kal-danger-soft px-4 py-2 text-sm font-semibold text-kal-danger-text disabled:opacity-50"
        >
          {busy === "erasure" ? "Submitting…" : TYPE_LABELS.erasure}
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-kal-border p-4">
        <h2 className="text-base font-semibold text-kal-text">Designate a nominee</h2>
        <p className="text-sm text-kal-text-secondary">
          Nominate someone to exercise your data rights on your behalf in case of
          death or incapacity.
        </p>
        <input
          type="text"
          value={nomineeName}
          onChange={(e) => setNomineeName(e.target.value)}
          placeholder="Nominee full name"
          className="w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm"
        />
        <input
          type="email"
          value={nomineeEmail}
          onChange={(e) => setNomineeEmail(e.target.value)}
          placeholder="Nominee email"
          className="w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void submitRequest("nomination", { nomineeName, nomineeEmail })
          }
          className="kal-glass-subtle min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy === "nomination" ? "Submitting…" : TYPE_LABELS.nomination}
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-kal-border p-4">
        <h2 className="text-base font-semibold text-kal-text">Withdraw consent</h2>
        <p className="text-sm text-kal-text-secondary">
          Withdraw consent for processing that relies on consent. Core account
          features may stop working until you agree again or request erasure.
        </p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void withdrawConsent()}
          className="kal-glass-subtle min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy === "withdraw" ? "Processing…" : "Withdraw consent"}
        </button>
      </section>

      {requests.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Your recent requests</h2>
          <ul className="space-y-2 text-sm">
            {requests.map((r) => (
              <li
                key={r.reference_id}
                className="rounded-lg border border-kal-border/80 px-3 py-2 text-kal-text-secondary"
              >
                <span className="font-mono text-kal-text">{r.reference_id}</span> —{" "}
                {TYPE_LABELS[r.type]} — {r.status} — due{" "}
                {new Date(r.due_at).toLocaleDateString("en-IN")}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
