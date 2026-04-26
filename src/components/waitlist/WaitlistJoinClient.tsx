"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXAMS_CATALOG_FALLBACK } from "@/lib/examsCatalog";

const EXAM_OPTIONS = EXAMS_CATALOG_FALLBACK
  .sort((a, b) => a.sort_order - b.sort_order)
  .map((e) => ({ value: e.exam_name, label: e.display_name }));

type Props = {
  batchNumber: number;
  opensAt: string | null;
  opensAtFormatted: string | null;
  totalInQueue: number;
};

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().+]/g, "").replace(/^(0|91)/, "");
}

export function WaitlistJoinClient({ batchNumber, opensAt: _opensAt, opensAtFormatted, totalInQueue }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [exam, setExam] = useState("");
  const [channel, setChannel] = useState<"email" | "push" | "both">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    const normalizedPhone = normalizePhone(phone.trim());
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!exam) {
      setError("Please select the exam you are preparing for.");
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, exam, notificationChannel: channel }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        position?: number;
        batchNumber?: number;
        opensAt?: string;
        aheadCount?: number;
      };

      if (!data.ok) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }

      // Store position data in sessionStorage for the position page.
      if (typeof window !== "undefined") {
        sessionStorage.setItem("wl_position", JSON.stringify({
          position: data.position,
          batchNumber: data.batchNumber,
          opensAt: data.opensAt,
          aheadCount: data.aheadCount,
        }));
      }

      router.push("/waitlist/position");
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-kal-page">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">

        {/* ── Left: Brand copy (hidden on mobile, shown first on md+) ── */}
        <div className="flex flex-1 flex-col justify-center px-8 py-16 md:py-24 md:pr-16">
          <div className="max-w-md">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-kal-accent">
              Batch {batchNumber}
            </p>
            <h1
              className="text-5xl font-normal leading-[1.08] tracking-tight text-kal-text sm:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your spot.
              <br />
              Your batch.
              <br />
              Your 3 days.
            </h1>

            <p className="mt-6 text-lg font-medium text-kal-text-secondary">
              {totalInQueue === 0
                ? "Be among the first — the queue is open."
                : totalInQueue === 1
                ? "1 student already in queue."
                : `${totalInQueue.toLocaleString("en-IN")} students already in queue.`}
            </p>

            {opensAtFormatted && (
              <p className="mt-2 text-sm text-kal-muted">
                Batch {batchNumber} opens {opensAtFormatted}
              </p>
            )}

            <div className="mt-8 space-y-2.5">
              {[
                "Every tool unlocked — Mastermind, Voice, Marks Engine",
                "60,000 Mastermind tokens · 5 min voice included",
                "Your position is locked the moment you submit",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kal-accent/70" aria-hidden />
                  <span className="text-sm leading-snug text-kal-text-secondary">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Form card ── */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 md:py-24 md:pl-0">
          <div className="kal-glass-panel w-full max-w-sm rounded-2xl border border-kal-border p-7 shadow-[var(--kal-shadow-card)]">
            <h2 className="mb-1 text-xl font-semibold text-kal-text">Join the waitlist</h2>
            <p className="mb-6 text-xs text-kal-muted">
              Your position is assigned the moment you submit.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-kal-text-secondary" htmlFor="wl-name">
                  Full name <span className="text-kal-accent">*</span>
                </label>
                <input
                  id="wl-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  required
                  maxLength={120}
                  className="w-full rounded-xl border border-kal-border bg-kal-card px-3.5 py-2.5 text-sm text-kal-text placeholder-kal-muted focus:border-kal-accent/50 focus:outline-none focus:ring-1 focus:ring-kal-accent/30"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-kal-text-secondary" htmlFor="wl-email">
                  Email <span className="text-kal-accent">*</span>
                </label>
                <input
                  id="wl-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  maxLength={320}
                  className="w-full rounded-xl border border-kal-border bg-kal-card px-3.5 py-2.5 text-sm text-kal-text placeholder-kal-muted focus:border-kal-accent/50 focus:outline-none focus:ring-1 focus:ring-kal-accent/30"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-kal-text-secondary" htmlFor="wl-phone">
                  Mobile number <span className="text-kal-accent">*</span>
                </label>
                <div className="flex items-center rounded-xl border border-kal-border bg-kal-card focus-within:border-kal-accent/50 focus-within:ring-1 focus-within:ring-kal-accent/30">
                  <span className="select-none pl-3.5 pr-2 text-sm text-kal-muted">+91</span>
                  <input
                    id="wl-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    required
                    maxLength={15}
                    inputMode="tel"
                    className="flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-kal-text placeholder-kal-muted focus:outline-none"
                  />
                </div>
              </div>

              {/* Exam */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-kal-text-secondary" htmlFor="wl-exam">
                  Exam you&apos;re preparing for <span className="text-kal-accent">*</span>
                </label>
                <select
                  id="wl-exam"
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  required
                  className="w-full rounded-xl border border-kal-border bg-kal-card px-3.5 py-2.5 text-sm text-kal-text focus:border-kal-accent/50 focus:outline-none focus:ring-1 focus:ring-kal-accent/30"
                >
                  <option value="">Select your exam</option>
                  {EXAM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Notification channel chips */}
              <div>
                <p className="mb-2 text-xs font-semibold text-kal-text-secondary">Notify me via</p>
                <div className="flex gap-2">
                  {(["email", "push", "both"] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannel(ch)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${
                        channel === ch
                          ? "border-kal-accent/50 bg-kal-accent/15 text-kal-accent"
                          : "border-kal-border text-kal-text-secondary hover:border-kal-accent/30 hover:text-kal-text"
                      }`}
                    >
                      {ch === "both" ? "Both" : ch === "push" ? "Push" : "Email"}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[48px] rounded-full bg-kal-accent px-6 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? "Locking in your spot…" : "Lock in my spot →"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-kal-muted">
              No credit card required. Your position is locked immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
