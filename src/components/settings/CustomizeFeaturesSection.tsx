"use client";

import clsx from "clsx";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, LayoutDashboard, Save } from "lucide-react";

import { saveEnabledFeatures } from "@/actions/profile";
import { FeatureSelector } from "@/components/features/FeatureSelector";
import { ALL_FEATURE_IDS } from "@/lib/dashboardFeatures";
import { useAuthStore } from "@/store/useAuthStore";
import { useEnabledFeaturesStore } from "@/store/useEnabledFeaturesStore";

export function CustomizeFeaturesSection() {
  const user = useAuthStore((s) => s.user);
  const storedFeatures = useEnabledFeaturesStore((s) => s.enabledFeatures);
  const storeLoading = useEnabledFeaturesStore((s) => s.loading);
  const setEnabledFeatures = useEnabledFeaturesStore((s) => s.setEnabledFeatures);
  const fetchStore = useEnabledFeaturesStore((s) => s.fetch);

  // Fetch on mount in case we landed here without going through HomeClient.
  useEffect(() => {
    if (user?.id) void fetchStore(user.id);
  }, [user?.id, fetchStore]);

  const [open, setOpen] = useState(false);

  // Sync local selection whenever the store resolves (handles async load).
  const [selected, setSelected] = useState<string[]>(ALL_FEATURE_IDS);
  useEffect(() => {
    if (!storeLoading) {
      setSelected(storedFeatures ?? ALL_FEATURE_IDS);
    }
  }, [storedFeatures, storeLoading]);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleSave() {
    setSaved(false);
    setSaveError(null);
    const toSave =
      selected.length === ALL_FEATURE_IDS.length ? null : selected;

    startTransition(async () => {
      const res = await saveEnabledFeatures(toSave);
      if (res.ok) {
        setEnabledFeatures(toSave);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(res.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  const activeCount = storedFeatures?.length ?? ALL_FEATURE_IDS.length;

  return (
    <section aria-labelledby="customize-features-heading">
      <div className="kal-glass-card overflow-hidden rounded-2xl">
        {/* Collapsible header button */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="customize-features-body"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-kal-border/80 bg-white/70 text-kal-accent dark:bg-zinc-900/40">
              <LayoutDashboard className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div>
              <h2
                id="customize-features-heading"
                className="text-base font-semibold tracking-tight text-kal-text"
              >
                Customize My Features
              </h2>
              <p className="text-xs leading-relaxed text-kal-text-secondary">
                {activeCount === ALL_FEATURE_IDS.length
                  ? "All features visible · tap to customise"
                  : `${activeCount} of ${ALL_FEATURE_IDS.length} features selected · tap to edit`}
              </p>
            </div>
          </div>
          <ChevronDown
            className={clsx(
              "h-4.5 w-4.5 shrink-0 text-kal-muted transition-transform duration-300",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {/* Collapsible body */}
        <div
          id="customize-features-body"
          className={clsx(
            "grid transition-all duration-300 ease-out",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-kal-border/75 px-5 pb-5 pt-4">
              <p className="mb-4 text-xs leading-relaxed text-kal-text-secondary">
                Choose the tools you want to see on your dashboard every day.
                You can edit your selected features anytime here.
              </p>

              <FeatureSelector selected={selected} onChange={setSelected} />

              {/* Save row */}
              <div className="mt-5 flex flex-col gap-2">
                {saveError && (
                  <p className="text-sm font-medium text-kal-danger-text">
                    {saveError}
                  </p>
                )}
                {saved && (
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Features saved successfully.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending || selected.length === 0}
                  className="kal-btn-accent inline-flex min-h-[48px] items-center justify-center gap-2 px-6 py-2.5 text-sm transition-opacity duration-200 disabled:opacity-50"
                >
                  {isPending ? (
                    "Saving…"
                  ) : (
                    <>
                      <Save className="h-4 w-4" aria-hidden />
                      Save My Features
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
