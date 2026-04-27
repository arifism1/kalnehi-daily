"use client";

import clsx from "clsx";
import {
  ChevronDown,
  Layers,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useId,
  useRef,
  useState,
} from "react";

import { saveEnabledExamsInTrack, upsertUserProfile } from "@/actions/profile";
import { KalSpinner } from "@/components/loading/KalSpinner";
import { KalnehiMark } from "@/components/KalnehiMark";
import { CuetDomainSubjectPick } from "@/components/profile/CuetDomainSubjectPick";
import { LoginMethodsSection } from "@/components/profile/LoginMethodsSection";
import { TrackExamToggles } from "@/components/profile/TrackExamToggles";
import { TrackPicker } from "@/components/onboarding/TrackPicker";
import { UpscOptionalSubjectPick } from "@/components/profile/UpscOptionalSubjectPick";
import { InstallPWA } from "@/components/InstallPWA";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  displayNameForExamCatalog,
  EXAMS_CATALOG_FALLBACK,
  fetchExamsCatalog,
} from "@/lib/examsCatalog";
import { isCuetExam } from "@/lib/examProfile";
import { parseCuetDomainSubjectsJson } from "@/lib/cuetDomainSubjects";
import type { ExamTrack } from "@/lib/examTracks";
import { trackById, trackForExamName } from "@/lib/examTracks";
import {
  isUpscCseMainsExam,
} from "@/lib/upscMainsOptionalSubjects";
import { SITE_NAME } from "@/lib/seo-metadata";
import { parsePrevScoreEntries } from "@/lib/prevScoreEntries";
import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatSupabaseError } from "@/lib/supabase";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

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
      <div className="kal-glass-panel overflow-hidden rounded-[1rem] transition-colors duration-200">
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

function LogoutFarewellScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-kal-page px-8 text-center">
      <KalnehiMark className="h-8 w-auto opacity-70" />
      <div className="space-y-2">
        <p className="font-serif text-2xl font-normal leading-snug text-kal-text">
          do good in life,
          <br />
          don&apos;t forget me hero!
        </p>
        <p className="text-sm text-kal-muted">Signing you out…</p>
      </div>
      <KalSpinner size="lg" />
    </div>
  );
}

export function ProfileForm() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [fullName, setFullName] = useState("");
  const [examDates, setExamDates] = useState<Record<string, string>>({});
  const [prevAttempted, setPrevAttempted] = useState(false);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);
  const [cuetDomainSubjects, setCuetDomainSubjects] = useState<string[]>([]);
  const [upscOptionalSubject, setUpscOptionalSubject] = useState("");
  const [upscOptionalSubjectOptions, setUpscOptionalSubjectOptions] = useState<
    string[]
  >([]);
  const [loadingUpscOptionals, setLoadingUpscOptionals] = useState(false);
  const [examRows, setExamRows] = useState(EXAMS_CATALOG_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [examHistoryOpen, setExamHistoryOpen] = useState(false);
  const examHistoryDisclosureId = useId();
  const examHistoryTriggerId = `profile-exam-history-trigger${examHistoryDisclosureId}`;
  const examHistoryPanelId = `profile-exam-history-panel${examHistoryDisclosureId}`;
  const fullNameInputRef = useRef<HTMLInputElement | null>(null);

  // Track system state
  const [selectedTrack, setSelectedTrack] = useState<ExamTrack | null>(null);
  const [enabledExamsInTrack, setEnabledExamsInTrack] = useState<string[]>([]);
  const [changeTrackOpen, setChangeTrackOpen] = useState(false);
  const [changeTrackConfirmOpen, setChangeTrackConfirmOpen] = useState(false);
  const [pendingNewTrack, setPendingNewTrack] = useState<ExamTrack | null>(null);

  // Mirrors save logic: primary_exam = first enabled exam in the current track selection.
  const formPrimaryExam = useMemo(
    () => enabledExamsInTrack[0] ?? "",
    [enabledExamsInTrack],
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
              "full_name, target_exam_date, exam_dates, primary_exam, target_exam, prev_exam_attempted, prev_score, prev_score_entries, cuet_domain_subjects, upsc_optional_subjects, selected_track, enabled_exams_in_track",
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

        // Resolve track from DB or infer from primary_exam
        const dbTrackId = data?.selected_track?.trim();
        const track = dbTrackId
          ? (trackById(dbTrackId) ?? trackForExamName(teRaw))
          : trackForExamName(teRaw);
        setSelectedTrack(track);
        const dbEnabled = Array.isArray(data?.enabled_exams_in_track)
          ? (data.enabled_exams_in_track as string[]).filter((e) => e?.trim())
          : track?.examNames ?? [];
        setEnabledExamsInTrack(dbEnabled.length > 0 ? dbEnabled : (track?.examNames ?? []));

        setFullName(data?.full_name?.trim() ?? "");
        // Hydrate per-exam dates. Fall back to target_exam_date for legacy users
        // who have not yet saved an exam_dates map.
        const dbExamDates =
          data?.exam_dates && typeof data.exam_dates === "object" && !Array.isArray(data.exam_dates)
            ? (data.exam_dates as Record<string, string>)
            : {};
        const legacyDate =
          data?.target_exam_date && /^\d{4}-\d{2}-\d{2}$/.test(data.target_exam_date)
            ? data.target_exam_date
            : null;
        const primaryKey = (data?.target_exam?.trim() || data?.primary_exam?.trim()) ?? "";
        if (Object.keys(dbExamDates).length > 0) {
          setExamDates(dbExamDates);
        } else if (legacyDate && primaryKey) {
          setExamDates({ [primaryKey]: legacyDate });
        } else {
          setExamDates({});
        }
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
        setUpscOptionalSubject(
          Array.isArray(data?.upsc_optional_subjects)
            ? (data.upsc_optional_subjects[0]?.trim() ?? "")
            : "",
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

  useEffect(() => {
    if (!isUpscCseMainsExam(formPrimaryExam)) {
      setUpscOptionalSubject("");
      return;
    }
    let cancelled = false;
    setLoadingUpscOptionals(true);
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: queryError } = await supabase
          .rpc("upsc_cse_mains_optional_subjects");
        if (queryError) throw queryError;
        if (cancelled) return;
        setUpscOptionalSubjectOptions(
          (data ?? []).map((r) => r.base_name).filter(Boolean),
        );
      } catch {
        if (!cancelled) setUpscOptionalSubjectOptions([]);
      } finally {
        if (!cancelled) setLoadingUpscOptionals(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formPrimaryExam]);

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
            setError("Add a label for each past score you enter.");
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
      if (!selectedTrack || enabledExamsInTrack.length === 0) {
        setError("Please select a track with at least one exam enabled.");
        return;
      }
      // primary_exam = first enabled exam (track order is preserved by TrackExamToggles)
      const primaryExamName = enabledExamsInTrack[0]!;
      const fullNameValue = fullNameInputRef.current?.value ?? fullName;
      // target_exam_date = first exam's date for backward compat
      const primaryDateRaw = examDates[primaryExamName]?.trim() || null;
      const filteredExamDates: Record<string, string> = {};
      for (const [k, v] of Object.entries(examDates)) {
        if (v?.trim()) filteredExamDates[k] = v.trim();
      }
      const res = await upsertUserProfile({
        full_name: fullNameValue.trim() || null,
        target_exam_date: primaryDateRaw,
        exam_dates: Object.keys(filteredExamDates).length > 0 ? filteredExamDates : null,
        primary_exam: primaryExamName,
        target_exam: primaryExamName,
        prev_exam_attempted: prevAttempted,
        prev_score_entries: prevAttempted ? prevEntries : [],
        cuet_domain_subjects:
          isCuetExam(primaryExamName) ? cuetDomainSubjects : [],
        upsc_optional_subject:
          isUpscCseMainsExam(primaryExamName) ? (upscOptionalSubject || null) : null,
        selected_track: selectedTrack.id,
        enabled_exams_in_track: enabledExamsInTrack,
      });
      if (!res.ok) {
        setError(surfaceErrorForUi(res.error));
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
    examDates,
    selectedTrack,
    enabledExamsInTrack,
    prevAttempted,
    scoreRows,
    cuetDomainSubjects,
    upscOptionalSubject,
    router,
  ]);

  const signOut = useCallback(async () => {
    setSignOutConfirmOpen(false);
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await Promise.all([
        supabase.auth.signOut(),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Clear the store manually if signOut throws so the user is not stuck.
      useAuthStore.getState().setAuth(null);
    }
    router.replace("/auth");
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

  const {
    status: subStatus,
    plan: subPlan,
    endDate: subEndDate,
    autopayMonthsTotal,
    hasPaidAccess,
  } = useSubscriptionAccess();

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
      {signingOut && <LogoutFarewellScreen />}
      <ConfirmDialog
        open={signOutConfirmOpen}
        title="Sign out?"
        description={`You will be logged out of ${SITE_NAME}.`}
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
              className="min-w-0 flex-1 rounded-lg border-0 bg-transparent py-1 text-base text-kal-text placeholder:text-kal-muted focus:outline-none focus:ring-0"
            />
          </Row>
        </Section>

        <Section
          title="Exam goals"
          footer="Your track controls which exams appear in the Syllabus Tracker."
        >
          {/* Track display row */}
          <Row className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <span className="flex items-center gap-1.5 w-28 shrink-0 text-[15px] font-medium text-kal-text-secondary">
              <Layers className="h-4 w-4" />
              Track
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="text-[15px] font-medium text-kal-text">
                {selectedTrack?.name ?? "No track selected"}
              </span>
              <button
                type="button"
                onClick={() => setChangeTrackOpen(true)}
                disabled={saving}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-kal-accent hover:text-kal-accent/80 disabled:pointer-events-none disabled:opacity-40"
              >
                Change Track
              </button>
            </div>
          </Row>

          {/* Enabled exams within track */}
          {selectedTrack && (
            <div className="border-t border-kal-border px-4 py-3">
              <p className="mb-1 text-xs font-semibold text-kal-text-secondary">
                Exams to show in Syllabus Tracker
              </p>
              <TrackExamToggles
                track={selectedTrack}
                enabledExams={enabledExamsInTrack}
                onChange={setEnabledExamsInTrack}
                catalog={examRows}
                disabled={saving}
              />
            </div>
          )}

          {/* Exam date(s) — one picker per enabled exam */}
          {enabledExamsInTrack.map((exam) => {
            const examDisplayLabel =
              displayNameForExamCatalog(exam, examRows) || exam;
            const inputId = `exam-date-${exam}`;
            return (
              <Row key={exam}>
                <label
                  htmlFor={inputId}
                  className="w-28 shrink-0 text-[15px] font-medium text-kal-text-secondary"
                >
                  {enabledExamsInTrack.length > 1 ? examDisplayLabel : "Exam"} date
                </label>
                <input
                  id={inputId}
                  type="date"
                  value={examDates[exam] ?? ""}
                  onChange={(e) =>
                    setExamDates((prev) => ({ ...prev, [exam]: e.target.value }))
                  }
                  className="min-w-0 flex-1 rounded-lg border-0 bg-transparent py-1 text-base text-kal-text [color-scheme:light] focus:outline-none focus:ring-0 dark:[color-scheme:dark]"
                />
              </Row>
            );
          })}
          {formPrimaryExam && isCuetExam(formPrimaryExam) ? (
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
          {formPrimaryExam && isUpscCseMainsExam(formPrimaryExam) ? (
            <div className="border-t border-kal-border px-4 py-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                Optional Subject (if any)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-kal-text-secondary">
                Optional. Keep <strong>None</strong> selected if you only want common
                papers right now.
              </p>
              <div className="mt-4">
                {loadingUpscOptionals ? (
                  <p className="text-xs text-kal-text-secondary">
                    Loading optional subjects...
                  </p>
                ) : (
                  <UpscOptionalSubjectPick
                    options={upscOptionalSubjectOptions}
                    selected={upscOptionalSubject}
                    onChange={setUpscOptionalSubject}
                    disabled={saving}
                  />
                )}
              </div>
            </div>
          ) : null}
        </Section>

        {/* Change Track modal — picker phase */}
        {changeTrackOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setChangeTrackOpen(false);
            }}
          >
            <div className="w-full max-w-lg overflow-y-auto rounded-2xl border border-kal-border bg-kal-bg-elevated p-5 shadow-xl max-h-[85vh]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-kal-text">
                  Change Track
                </h2>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChangeTrackOpen(false);
                      setPendingNewTrack(null);
                    }}
                    className="rounded-xl border border-kal-border px-3 py-1.5 text-sm font-medium text-kal-text-secondary hover:text-kal-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!pendingNewTrack || pendingNewTrack.id === selectedTrack?.id}
                    onClick={() => {
                      setChangeTrackOpen(false);
                      setChangeTrackConfirmOpen(true);
                    }}
                    className="rounded-xl bg-kal-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Select
                  </button>
                </div>
              </div>
              <p className="mb-4 text-sm text-kal-text-secondary">
                Changing your track will reset your exam selection. This cannot be
                easily undone.
              </p>
              <TrackPicker
                selected={pendingNewTrack ?? selectedTrack}
                onSelect={(track) => setPendingNewTrack(track)}
                catalog={examRows}
                disabled={saving}
              />
            </div>
          </div>
        )}

        {/* Change Track — confirmation dialog */}
        <ConfirmDialog
          open={changeTrackConfirmOpen}
          title="Change track?"
          description={
            pendingNewTrack
              ? `You are switching to "${pendingNewTrack.name}". Your current exam selection will be replaced with all exams in the new track.`
              : ""
          }
          confirmLabel="Change Track"
          cancelLabel="Keep Current"
          danger
          onCancel={() => {
            setChangeTrackConfirmOpen(false);
            setPendingNewTrack(null);
          }}
          onConfirm={() => {
            if (!pendingNewTrack) return;
            setSelectedTrack(pendingNewTrack);
            setEnabledExamsInTrack(pendingNewTrack.examNames);
            setChangeTrackConfirmOpen(false);
            setPendingNewTrack(null);
            void saveEnabledExamsInTrack({
              selected_track: pendingNewTrack.id,
              enabled_exams_in_track: pendingNewTrack.examNames,
            }).then((res) => {
              if (res.ok) {
                window.dispatchEvent(new Event(KALNEHI_PROFILE_UPDATED_EVENT));
                router.refresh();
              }
            });
          }}
        />

        <section className="transition-opacity duration-300">
          <h2 className="px-3 pb-2">
            <button
              id={examHistoryTriggerId}
              type="button"
              aria-expanded={examHistoryOpen}
              aria-controls={examHistoryPanelId}
              onClick={() => setExamHistoryOpen((o) => !o)}
              className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-lg py-0.5 pr-0.5 text-left transition-colors hover:bg-kal-accent/5"
            >
              <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                Exam history
              </span>
              <ChevronDown
                className={clsx(
                  "h-4 w-4 shrink-0 text-kal-muted transition-transform duration-300",
                  examHistoryOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          </h2>
          <div
            id={examHistoryPanelId}
            role="region"
            aria-labelledby={examHistoryTriggerId}
            className={clsx(
              "grid transition-[grid-template-rows] duration-300 ease-out",
              examHistoryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="kal-glass-panel overflow-hidden rounded-[1rem] transition-colors duration-200">
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
                        Label the attempt, then enter marks. Use &quot;Add
                        another score&quot; for more tries.
                      </p>
                      <ul className="space-y-3">
                        {scoreRows.map((row, index) => (
                          <li
                            key={row.id}
                            className="kal-glass-subtle flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-end sm:gap-3"
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
                                      r.id === row.id
                                        ? { ...r, label: v }
                                        : r,
                                    ),
                                  );
                                }}
                                placeholder="e.g. 2025 — first attempt"
                                autoComplete="off"
                                className="mt-1 w-full rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
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
                                      r.id === row.id
                                        ? { ...r, score: v }
                                        : r,
                                    ),
                                  );
                                }}
                                placeholder="e.g. 412"
                                className="mt-1 w-full rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
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
                              className="flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-xs font-semibold text-kal-text-secondary transition-colors hover:border-[var(--kal-danger-border)] hover:bg-[var(--kal-danger-soft)] hover:text-[var(--kal-danger-text)] disabled:pointer-events-none disabled:opacity-40"
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
                        className="kal-glass-subtle flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-white/35 py-2.5 text-sm font-semibold text-kal-accent transition-colors hover:border-kal-accent/35 hover:bg-kal-accent-soft/50 dark:border-white/15"
                      >
                        <Plus
                          className="h-4 w-4"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                        Add another score
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {examHistoryOpen ? (
            <p className="mt-2 px-3 text-[11px] leading-relaxed text-kal-text-secondary">
              Add each past attempt with a short label and marks. If you tried
              more than once, note the year or attempt number in the label.
            </p>
          ) : null}
        </section>

        {error && (
          <p className="rounded-2xl border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] px-4 py-3 text-sm text-[var(--kal-danger-text)]">
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
          className="kal-btn-accent flex w-full min-h-[52px] items-center justify-center gap-2 py-3.5 text-[15px] transition-opacity duration-200 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save profile
        </button>
      </form>

      <div id="login-methods" className="scroll-mt-24">
        <Section
          title="Login methods"
          footer="Link Google or add a password so you always have another way to sign in to the same account."
        >
          <LoginMethodsSection />
        </Section>
      </div>

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
            <div className="kal-glass-subtle flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
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
          {subStatus ? (
            <div className="mb-3 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                Current plan
              </p>
              <p className="mt-1 text-sm font-medium text-kal-text">
                {subPlan === "annual"
                  ? "Annual Smart Plan"
                  : subPlan === "six_month"
                    ? "6-Month Smart Plan"
                    : subPlan === "monthly" || subPlan === "trial"
                      ? "Monthly Smart Plan"
                      : "Smart Plan"}
                {" · "}
                <span
                  className={
                    subStatus === "active" || subStatus === "trial"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : subStatus === "cancelled"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-kal-text-secondary"
                  }
                >
                  {subStatus === "active"
                    ? "Active"
                    : subStatus === "trial"
                      ? "Trial"
                      : subStatus === "cancelled"
                        ? hasPaidAccess
                          ? "Cancelled (access continues)"
                          : "Cancelled"
                        : subStatus === "expired"
                          ? "Expired"
                          : subStatus}
                </span>
              </p>
              {subEndDate ? (
                <p className="mt-0.5 text-xs text-kal-text-secondary">
                  {subPlan === "annual" || subPlan === "six_month"
                    ? "Plan runs until"
                    : subStatus === "cancelled"
                      ? "Access until"
                      : "Month ends"}{" "}
                  {new Date(subEndDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {(subPlan === "monthly" || subPlan === "trial") &&
                    autopayMonthsTotal !== null &&
                    subStatus !== "cancelled" && (
                      <> · AutoPay up to {autopayMonthsTotal} month{autopayMonthsTotal === 1 ? "" : "s"}</>
                    )}
                </p>
              ) : null}
            </div>
          ) : null}
          <Link
            href="/my-subscription"
            className="kal-glass-subtle mb-3 flex w-full min-h-[48px] items-center justify-center rounded-xl py-3 text-[15px] font-semibold text-kal-text transition-colors hover:opacity-95 active:opacity-90"
          >
            My Subscription &amp; billing
          </Link>
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
