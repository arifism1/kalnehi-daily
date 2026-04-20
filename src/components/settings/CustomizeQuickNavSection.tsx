"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, ListTree, RotateCcw, Save } from "lucide-react";

import { saveQuickNavHrefs } from "@/actions/profile";
import { getDefaultQuickNavItemsInOrder } from "@/config/mainNavigation";
import { SettingsSheetSwitch } from "@/components/settings/SettingsSheetSwitch";
import {
  normalizeQuickNavHrefsRow,
  useEnabledFeaturesStore,
} from "@/store/useEnabledFeaturesStore";
import { surfaceOptionalString } from "@/lib/userFacingErrors";

function hrefSetToSave(
  selected: Set<string>,
  defaultHrefs: readonly string[],
): string[] | null {
  const ordered = defaultHrefs.filter((h) => selected.has(h));
  if (ordered.length === defaultHrefs.length) {
    return null;
  }
  if (ordered.length === 0) {
    return [];
  }
  return ordered;
}

export function CustomizeQuickNavSection() {
  const storedFeatures = useEnabledFeaturesStore((s) => s.enabledFeatures);
  const quickNavHrefs = useEnabledFeaturesStore((s) => s.quickNavHrefs);
  const hydratedFromProfile = useEnabledFeaturesStore((s) => s.hydratedFromProfile);
  const setQuickNavHrefs = useEnabledFeaturesStore((s) => s.setQuickNavHrefs);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const defaultItems = useMemo(
    () => getDefaultQuickNavItemsInOrder(storedFeatures),
    [storedFeatures],
  );
  const defaultHrefs = useMemo(
    () => defaultItems.map((i) => i.href),
    [defaultItems],
  );

  const defaultHrefsKey = defaultHrefs.join("|");

  useEffect(() => {
    if (!hydratedFromProfile) return;
    if (quickNavHrefs === null) {
      setSelected(new Set(defaultHrefs));
      return;
    }
    if (quickNavHrefs.length === 0) {
      setSelected(new Set());
      return;
    }
    const allow = new Set(defaultHrefs);
    const next = new Set<string>();
    for (const h of quickNavHrefs) {
      if (allow.has(h)) next.add(h);
    }
    setSelected(next);
  }, [quickNavHrefs, hydratedFromProfile, defaultHrefsKey]);

  const selectedCount = useMemo(
    () => defaultHrefs.filter((h) => selected.has(h)).length,
    [defaultHrefs, selected],
  );

  function handleSave() {
    setSaved(false);
    setSaveError(null);
    const toSave = hrefSetToSave(selected, defaultHrefs);

    startTransition(async () => {
      const res = await saveQuickNavHrefs(toSave);
      if (res.ok) {
        setQuickNavHrefs(normalizeQuickNavHrefsRow(toSave));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(
          surfaceOptionalString(
            res.error,
            "Something went wrong. Please try again.",
          ),
        );
      }
    });
  }

  function resetToAppDefaults() {
    setSaveError(null);
    setSaved(false);
    setSelected(new Set(defaultHrefs));
    startTransition(async () => {
      const res = await saveQuickNavHrefs(null);
      if (res.ok) {
        setQuickNavHrefs(normalizeQuickNavHrefsRow(null));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(
          surfaceOptionalString(
            res.error,
            "Something went wrong. Please try again.",
          ),
        );
      }
    });
  }

  const summary =
    !hydratedFromProfile
      ? "Loading…"
      : quickNavHrefs === null && selectedCount === defaultHrefs.length
        ? "App default shortcuts · tap to customise"
        : quickNavHrefs === null
          ? `${selectedCount} of ${defaultHrefs.length} in top bar`
          : selectedCount === 0
            ? "No shortcuts in the top bar"
            : `${selectedCount} shortcut${selectedCount === 1 ? "" : "s"} in the top bar · tap to edit`;

  if (!defaultItems.length) {
    return null;
  }

  return (
    <section aria-labelledby="customize-quicknav-heading">
      <div className="kal-glass-card overflow-hidden rounded-2xl">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="customize-quicknav-body"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-kal-border/80 bg-white/70 text-kal-accent dark:bg-zinc-900/40">
              <ListTree className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2
                id="customize-quicknav-heading"
                className="text-base font-semibold tracking-tight text-kal-text"
              >
                Customize Quick Nav
              </h2>
              <p className="text-xs leading-relaxed text-kal-text-secondary">
                {summary}
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

        <div
          id="customize-quicknav-body"
          className={clsx(
            "grid transition-all duration-300 ease-out",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-kal-border/75 px-5 pb-5 pt-4">
              <p className="mb-4 text-xs leading-relaxed text-kal-text-secondary">
                Choose which shortcuts appear in the horizontal bar between the logo
                and alerts. Order follows the app default; turn items off to reduce
                clutter, or show only what you use daily. This does not change the
                hamburger menu or the dashboard.
              </p>

              {saveError && (
                <p className="mb-3 text-sm font-medium text-kal-danger-text">
                  {saveError}
                </p>
              )}
              {saved && (
                <p className="mb-3 text-sm font-medium text-green-700 dark:text-green-400">
                  Top bar saved.
                </p>
              )}

              <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={resetToAppDefaults}
                  disabled={isPending}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-kal-border/90 bg-white/50 px-3 py-2 text-xs font-semibold text-kal-text transition-colors hover:bg-white/80 dark:border-white/15 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80 sm:min-h-[44px] sm:px-4 sm:text-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Use all defaults
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="kal-btn-accent inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-opacity duration-200 disabled:opacity-50 sm:min-h-[44px] sm:px-5 sm:text-sm"
                >
                  {isPending ? (
                    "Saving…"
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                      Save
                    </>
                  )}
                </button>
              </div>

              <ul className="divide-y divide-kal-border/60 rounded-xl border border-kal-border/70 bg-white/30 dark:bg-zinc-900/20">
                {defaultItems.map((item) => {
                  const { Icon, href, label, shortLabel } = item;
                  const id = `quicknav-${encodeURIComponent(href).replace(/%/g, "_")}`;
                  return (
                    <li
                      key={href}
                      className="flex min-h-[3.25rem] items-center justify-between gap-3 px-3 py-2.5 first:rounded-t-[0.7rem] last:rounded-b-[0.7rem] sm:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/50 text-kal-text-secondary dark:border-white/10 dark:bg-zinc-800/50">
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        </span>
                        <span className="min-w-0 text-left text-sm font-medium text-kal-text">
                          {shortLabel || label}
                        </span>
                      </div>
                      <SettingsSheetSwitch
                        id={id}
                        size="sm"
                        checked={selected.has(href)}
                        onChange={(on) => {
                          setSelected((prev) => {
                            const n = new Set(prev);
                            if (on) n.add(href);
                            else n.delete(href);
                            return n;
                          });
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
