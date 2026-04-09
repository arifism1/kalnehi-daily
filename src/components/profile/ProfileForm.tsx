"use client";

import clsx from "clsx";
import {
  ChevronRight,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  UserCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { upsertUserProfile } from "@/actions/profile";
import { CuetDomainSubjectPick } from "@/components/profile/CuetDomainSubjectPick";
import { CancelSubscriptionButton } from "@/components/subscription/CancelSubscriptionButton";
import { InstallPWA } from "@/components/InstallPWA";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  EXAMS_CATALOG_FALLBACK,
  fetchExamsCatalog,
  mergeOrphanExamOption,
  resolveInitialTargetExamName,
} from "@/lib/examsCatalog";
import { isCuetExam } from "@/lib/examProfile";
import { parseCuetDomainSubjectsJson } from "@/lib/cuetDomainSubjects";
import { parsePrevScoreEntries } from "@/lib/prevScoreEntries";
import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatSupabaseError } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

const Section = memo(function Section({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="transition-opacity duration-300">
      <h2 className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[1rem] border border-kal-border bg-kal-card kal-shadow-card transition-colors duration-200">
        {children}
      </div>
      {footer ? (
        <p className="mt-2 px-3 text-[11px] leading-relaxed text-kal-text-secondary">
          {footer}
        </p>
      ) : null}
    </section>
  );
});

const Row = memo(function Row({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex min-h-[52px] items-center gap-3 border-b border-kal-border px-4 py-3 last:border-b-0",
        className,
      )}
    >
      {children}
    </div>
  );
});

type ScoreRow = { id: string; label: string; score: string };

export function ProfileForm() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [fullName, setFullName] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [examDate, setExamDate] = useState("");
  const [prevAttempted, setPrevAttempted] = useState(false);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);
  const [cuetDomainSubjects, setCuetDomainSubjects] = useState<string[]>([]);
  const [examRows, setExamRows] = useState(EXAMS_CATALOG_FALLBACK);
  const [initialExamRaw, setInitialExamRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const fullNameInputRef = useRef<HTMLInputElement | null>(null);

  const examSelectOptions = useMemo(
    () => mergeOrphanExamOption(examRows, initialExamRaw),
    [examRows, initialExamRaw],
  );
  const deferredTargetExam = useDeferredValue(targetExam);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const [{ data, error: qErr }, catalog] = await Promise.all([
          supabase
            .from("user_profiles")
            .select(
              "full_name, target_exam_date, primary_exam, target_exam, prev_exam_attempted, prev_score, prev_score_entries, cuet_domain_subjects",
            )
            .eq("user_id", user.id)
            .maybeSingle(),
          fetchExamsCatalog(supabase),
        ]);
        if (cancelled) return;
        if (qErr) throw qErr;

        setExamRows(catalog);

        const teRaw =
          data?.target_exam?.trim() || data?.primary_exam?.trim() || "";
        setInitialExamRaw(teRaw || null);

        const merged = mergeOrphanExamOption(catalog, teRaw || null);
        setTargetExam(resolveInitialTargetExamName(teRaw, merged));

        setFullName(data?.full_name?.trim() ?? "");
        setExamDate(
          data?.target_exam_date &&
            /^\d{4}-\d{2}-\d{2}$/.test(data.target_exam_date)
            ? data.target_exam_date
            : "",
        );
        const attempted = Boolean(data?.prev_exam_attempted);
        setPrevAttempted(attempted);
        const parsed = parsePrevScoreEntries(data?.prev_score_entries);
        const legacyScore = data?.prev_score;
        const initialEntries =
          parsed.length > 0
            ? parsed
            : attempted && legacyScore != null
              ? [{ label: "Previous attempt", score: legacyScore }]
              : [];
        setScoreRows(
          initialEntries.map((e) => ({
            id: crypto.randomUUID(),
            label: e.label,
            score: String(e.score),
          })),
        );
        setCuetDomainSubjects(
          parseCuetDomainSubjectsJson(data?.cuet_domain_subjects),
        );
      } catch (e) {
        if (!cancelled) setError(formatSupabaseError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const submit = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const prevEntries: { label: string; score: number }[] = [];
      if (prevAttempted) {
        for (const row of scoreRows) {
          const label = row.label.trim();
          const rawScore = row.score.trim();
          if (!label && !rawScore) continue;
          if (!label) {
            setError("Add a label for each score (e.g. UPSC Pre 2025).");
            return;
          }
          const n = Number(rawScore);
          if (!Number.isFinite(n) || n < 0) {
            setError("Enter a valid marks value for each entry.");
            return;
          }
          prevEntries.push({ label, score: Math.round(n) });
        }
        if (prevEntries.length === 0) {
          setError(
            'Add at least one past score or turn off "Attempted before".',
          );
          return;
        }
      }
      /** Option `value` is `exams.exam_name` (e.g. `JEE Main 2025`, `NEET UG`). */
      const examName = targetExam.trim() ? targetExam.trim() : null;
      if (!examName) {
        setError("Select your target exam before saving.");
        return;
      }
      const fullNameValue = fullNameInputRef.current?.value ?? fullName;
      const res = await upsertUserProfile({
        full_name: fullNameValue.trim() || null,
        target_exam_date: examDate.trim() || null,
        primary_exam: examName,
        target_exam: examName,
        prev_exam_attempted: prevAttempted,
        prev_score_entries: prevAttempted ? prevEntries : [],
        cuet_domain_subjects:
          examName && isCuetExam(examName) ? cuetDomainSubjects : [],
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      window.dispatchEvent(new Event(KALNEHI_PROFILE_UPDATED_EVENT));
      router.refresh();
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setSaving(false);
    }
  }, [
    user?.id,
    fullName,
    examDate,
    targetExam,
    prevAttempted,
    scoreRows,
    cuetDomainSubjects,
    router,
  ]);

  const signOut = useCallback(async () => {
    setSignOutConfirmOpen(false);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    router.replace("/auth");
    router.refresh();
  }, [router]);

  const togglePrevAttempted = useCallback(() => {
    setPrevAttempted((was) => {
      if (was) {
        setScoreRows([]);
        return false;
      }
      setScoreRows((rows) =>
        rows.length === 0
          ? [{ id: crypto.randomUUID(), label: "", score: "" }]
          : rows,
      );
      return true;
    });
  }, []);

  const addScoreRow = useCallback(() => {
    setScoreRows((rows) => [
      ...rows,
      { id: crypto.randomUUID(), label: "", score: "" },
    ]);
  }, []);

  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl =
    (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta?.picture === "string" && meta.picture) ||
    null;

  if (!user) {
    return (
      <p className="text-sm text-kal-text-secondary">
        Sign in to edit your profile and exam settings.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-kal-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog
        open={signOutConfirmOpen}
        title="Sign out?"
        description="You will be logged out of Kalnehi Daily."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        danger
        onCancel={() => setSignOutConfirmOpen(false)}
        onConfirm={() => void signOut()}
      />

      <InstallPWA />

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Section
          title="Identity"
          footer="Used across the app and in your study summaries."
        >
          <Row>
            <label
              htmlFor="full-name"
              className="w-28 shrink-0 text-[15px] font-medium text-kal-text-secondary"
            >
              Full name
            </label>
            <input
              id="full-name"
              type="text"
              autoComplete="name"
              ref={fullNameInputRef}
              defaultValue={fullName}
              onBlur={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="min-w-0 flex-1 rounded-lg border-0 bg-transparent py-1 text-[15px] text-kal-text placeholder:text-kal-muted focus:outline-none focus:ring-0"
            />
          </Row>
        </Section>

        <Section
          title="Exam goals"
          footer="Target exam powers labels and your home countdown date."
        >
          <Row className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <span className="w-28 shrink-0 text-[15px] font-medium text-kal-text-secondary">
              Target exam
            </span>
            <div className="relative min-w-0 flex-1">
              <select
                id="target-exam"
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                className="w-full appearance-none rounded-lg border border-kal-border bg-kal-card-muted py-2.5 pr-10 pl-3 text-[15px] text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              >
                <option value="">Select…</option>
                {examSelectOptions.map((opt) => (
                  <option key={opt.exam_name} value={opt.exam_name}>
                    {opt.display_name}
                  </option>
                ))}
              </select>
              <ChevronRight
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 rotate-90 text-kal-muted"
                aria-hidden
              />
            </div>
          </Row>
          <Row>
            <label
              htmlFor="exam-date"
              className="w-28 shrink-0 text-[15px] font-medium text-kal-text-secondary"
            >
              Exam date
            </label>
            <input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border-0 bg-transparent py-1 text-[15px] text-kal-text [color-scheme:light] focus:outline-none focus:ring-0 dark:[color-scheme:dark]"
            />
          </Row>
          {deferredTargetExam && isCuetExam(deferredTargetExam) ? (
            <div className="border-t border-kal-border px-4 py-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                CUET domain subjects
              </p>
              <p className="mt-1 text-xs leading-relaxed text-kal-text-secondary">
                Select every subject you are attempting. Your syllabus, planner
                weights, and projected score use ~200 marks per subject (normalised
                total).
              </p>
              <div className="mt-4">
                <CuetDomainSubjectPick
                  selected={cuetDomainSubjects}
                  onChange={setCuetDomainSubjects}
                  disabled={saving}
                />
              </div>
            </div>
          ) : null}
        </Section>

        <Section
          title="Exam history"
          footer="Add each past attempt with a short label and marks (e.g. UPSC Pre 2025, 2024 attempt)."
        >
          <Row>
            <span className="min-w-0 flex-1 text-[15px] font-medium text-kal-text-secondary">
              Attempted before?
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={prevAttempted}
              onClick={togglePrevAttempted}
              className={clsx(
                "relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-300",
                prevAttempted ? "bg-kal-accent" : "bg-kal-border",
              )}
            >
              <span
                className={clsx(
                  "absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300",
                  prevAttempted ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
            <span className="w-10 text-right text-sm font-medium text-kal-text-secondary">
              {prevAttempted ? "Yes" : "No"}
            </span>
          </Row>
          <div
            className={clsx(
              "grid transition-[grid-template-rows] duration-300 ease-out",
              prevAttempted ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 border-t border-kal-border px-4 py-4">
                <p className="text-xs text-kal-text-secondary">
                  Label the attempt, then enter marks. Use &quot;Add another
                  score&quot; for more tries.
                </p>
                <ul className="space-y-3">
                  {scoreRows.map((row, index) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 rounded-xl border border-kal-border bg-kal-card-muted p-3 sm:flex-row sm:items-end sm:gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={`prev-label-${row.id}`}
                          className="text-[11px] font-medium text-kal-text-secondary"
                        >
                          Attempt label
                        </label>
                        <input
                          id={`prev-label-${row.id}`}
                          type="text"
                          value={row.label}
                          onChange={(e) => {
                            const v = e.target.value;
                            setScoreRows((rows) =>
                              rows.map((r) =>
                                r.id === row.id ? { ...r, label: v } : r,
                              ),
                            );
                          }}
                          placeholder="e.g. UPSC Pre 2025"
                          autoComplete="off"
                          className="mt-1 w-full rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-[15px] text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                        />
                      </div>
                      <div className="w-full shrink-0 sm:w-28">
                        <label
                          htmlFor={`prev-marks-${row.id}`}
                          className="text-[11px] font-medium text-kal-text-secondary"
                        >
                          Marks
                        </label>
                        <input
                          id={`prev-marks-${row.id}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={row.score}
                          onChange={(e) => {
                            const v = e.target.value;
                            setScoreRows((rows) =>
                              rows.map((r) =>
                                r.id === row.id ? { ...r, score: v } : r,
                              ),
                            );
                          }}
                          placeholder="e.g. 412"
                          className="mt-1 w-full rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-[15px] text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setScoreRows((rows) =>
                            rows.filter((r) => r.id !== row.id),
                          )
                        }
                        disabled={scoreRows.length <= 1}
                        className="flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-xs font-semibold text-kal-text-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-800 disabled:pointer-events-none disabled:opacity-40 dark:hover:border-rose-500/30 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
                        aria-label={`Remove score row ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={addScoreRow}
                  className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-kal-border bg-kal-card py-2.5 text-sm font-semibold text-kal-accent transition-colors hover:border-kal-accent/35 hover:bg-kal-accent-soft"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  Add another score
                </button>
              </div>
            </div>
          </div>
        </Section>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </p>
        )}

        {saved && (
          <p className="text-center text-sm font-medium text-kal-accent" role="status">
            Saved.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3.5 text-[15px] font-semibold text-kal-accent-foreground shadow-sm transition-opacity duration-200 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save profile
        </button>
      </form>

      <Section title="Account" footer="Session and sign-in for this device.">
        <Row className="items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full border border-kal-border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-kal-border bg-kal-card-muted">
              <UserCircle className="h-8 w-8 text-kal-muted" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
              Signed in as
            </p>
            <p className="truncate text-sm text-kal-text">{user.email}</p>
          </div>
        </Row>
        <div className="border-t border-kal-border px-4 py-3">
          <CancelSubscriptionButton className="mb-3 flex w-full min-h-[48px] items-center justify-center rounded-xl border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] py-3 text-[15px] font-semibold text-[var(--kal-danger-text)]" />
          <button
            type="button"
            onClick={() => setSignOutConfirmOpen(true)}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] py-3 text-[15px] font-semibold text-[var(--kal-danger-text)] active:opacity-90"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </Section>
    </div>
  );
}
