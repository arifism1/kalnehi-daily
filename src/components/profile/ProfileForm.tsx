"use client";

import clsx from "clsx";
import { ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { upsertUserProfile } from "@/actions/profile";
import { CuetDomainSubjectPick } from "@/components/profile/CuetDomainSubjectPick";
import { InstallPWA } from "@/components/InstallPWA";
import {
  EXAMS_CATALOG_FALLBACK,
  fetchExamsCatalog,
  mergeOrphanExamOption,
  resolveInitialTargetExamName,
} from "@/lib/examsCatalog";
import { isCuetExam } from "@/lib/examProfile";
import { parseCuetDomainSubjectsJson } from "@/lib/cuetDomainSubjects";
import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatSupabaseError } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

function Section({
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
      <h2 className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/60 shadow-sm backdrop-blur-sm transition-colors duration-200">
        {children}
      </div>
      {footer ? (
        <p className="mt-2 px-3 text-[11px] leading-relaxed text-zinc-600">
          {footer}
        </p>
      ) : null}
    </section>
  );
}

function Row({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex min-h-[52px] items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-b-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ProfileForm() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [fullName, setFullName] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [examDate, setExamDate] = useState("");
  const [prevAttempted, setPrevAttempted] = useState(false);
  const [prevScore, setPrevScore] = useState<string>("");
  const [cuetDomainSubjects, setCuetDomainSubjects] = useState<string[]>([]);
  const [examRows, setExamRows] = useState(EXAMS_CATALOG_FALLBACK);
  const [initialExamRaw, setInitialExamRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const examSelectOptions = useMemo(
    () => mergeOrphanExamOption(examRows, initialExamRaw),
    [examRows, initialExamRaw],
  );

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
              "full_name, target_exam_date, primary_exam, target_exam, prev_exam_attempted, prev_score, cuet_domain_subjects",
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
        setPrevAttempted(Boolean(data?.prev_exam_attempted));
        setPrevScore(
          data?.prev_score != null ? String(data.prev_score) : "",
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
      const scoreNum = prevScore.trim() ? Number(prevScore) : NaN;
      if (prevAttempted && prevScore.trim() && Number.isNaN(scoreNum)) {
        setError("Enter a valid previous score.");
        return;
      }
      /** Option `value` is `exams.exam_name` (e.g. `JEE Main 2025`, `NEET UG`). */
      const examName = targetExam.trim() ? targetExam.trim() : null;
      const res = await upsertUserProfile({
        full_name: fullName.trim() || null,
        target_exam_date: examDate.trim() || null,
        primary_exam: examName,
        target_exam: examName,
        prev_exam_attempted: prevAttempted,
        prev_score: prevAttempted && !Number.isNaN(scoreNum) ? scoreNum : null,
        cuet_domain_subjects:
          examName && isCuetExam(examName) ? cuetDomainSubjects : [],
      });
      if (!res.ok) throw new Error(res.error);
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
    prevScore,
    cuetDomainSubjects,
    router,
  ]);

  if (!user) {
    return (
      <p className="text-sm text-zinc-500">
        Sign in to edit your profile and exam settings.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
              className="w-28 shrink-0 text-[15px] text-zinc-300"
            >
              Full name
            </label>
            <input
              id="full-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="min-w-0 flex-1 rounded-lg border-0 bg-transparent py-1 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0"
            />
          </Row>
        </Section>

        <Section
          title="Exam goals"
          footer="Target exam powers labels and your home countdown date."
        >
          <Row className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <span className="w-28 shrink-0 text-[15px] text-zinc-300">
              Target exam
            </span>
            <div className="relative min-w-0 flex-1">
              <select
                id="target-exam"
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-700/80 bg-slate-950/80 py-2.5 pr-10 pl-3 text-[15px] text-white focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Select…</option>
                {examSelectOptions.map((opt) => (
                  <option key={opt.exam_name} value={opt.exam_name}>
                    {opt.display_name}
                  </option>
                ))}
              </select>
              <ChevronRight
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-500"
                aria-hidden
              />
            </div>
          </Row>
          <Row>
            <label
              htmlFor="exam-date"
              className="w-28 shrink-0 text-[15px] text-zinc-300"
            >
              Exam date
            </label>
            <input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border-0 bg-transparent py-1 text-[15px] text-white focus:outline-none focus:ring-0"
            />
          </Row>
          {targetExam && isCuetExam(targetExam) ? (
            <div className="border-t border-white/[0.06] px-4 py-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500">
                CUET domain subjects
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
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
          footer="Helps tailor difficulty and expectations."
        >
          <Row>
            <span className="min-w-0 flex-1 text-[15px] text-zinc-300">
              Attempted before?
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={prevAttempted}
              onClick={() => setPrevAttempted((v) => !v)}
              className={clsx(
                "relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-300",
                prevAttempted ? "bg-emerald-600" : "bg-zinc-600",
              )}
            >
              <span
                className={clsx(
                  "absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300",
                  prevAttempted ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
            <span className="w-10 text-right text-sm text-zinc-500">
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
              <Row>
                <label
                  htmlFor="prev-score"
                  className="w-28 shrink-0 text-[15px] text-zinc-300"
                >
                  Prev. score
                </label>
                <input
                  id="prev-score"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={prevScore}
                  onChange={(e) => setPrevScore(e.target.value)}
                  placeholder="e.g. 612"
                  className="min-w-0 flex-1 rounded-lg border-0 bg-transparent py-1 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                />
              </Row>
            </div>
          </div>
        </Section>

        {error && (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        {saved && (
          <p className="text-center text-sm font-medium text-emerald-400" role="status">
            Saved.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-emerald-900/20 transition-opacity duration-200 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save profile
        </button>
      </form>
    </div>
  );
}
