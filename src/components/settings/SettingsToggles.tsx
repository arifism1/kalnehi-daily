"use client";

import clsx from "clsx";
import { Palette } from "lucide-react";
import { useId } from "react";

import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";
import {
  type AppearanceMode,
  useSettingsStore,
} from "@/store/useSettingsStore";

function SheetSwitch({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id: string;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-label={label}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-9 w-14 shrink-0 rounded-full transition-[background-color] duration-200",
        checked ? "bg-kal-accent" : "bg-kal-border",
      )}
    >
      <span
        className={clsx(
          "absolute top-1 left-1 size-7 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[1.35rem]" : "translate-x-0",
        )}
      />
    </button>
  );
}

const APPEARANCE_OPTIONS: { value: AppearanceMode; label: string }[] = [
  { value: "light", label: "Orange theme" },
  { value: "dark", label: "Coffee theme" },
  { value: "system", label: "Match device" },
];

function ToggleStateBadge({ checked }: { checked: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex min-w-11 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        checked
          ? "bg-kal-accent/20 text-kal-accent"
          : "bg-kal-border/70 text-kal-text-secondary",
      )}
    >
      {checked ? "On" : "Off"}
    </span>
  );
}

export function SettingsToggles() {
  const baseId = useId();

  const appearance = useSettingsStore((s) => s.appearance ?? "light");
  const setAppearance = useSettingsStore((s) => s.setAppearance);
  const showCountdown = useSettingsStore((s) => s.showCountdown);
  const setShowCountdown = useSettingsStore((s) => s.setShowCountdown);
  const soundEffects = useSettingsStore((s) => s.soundEffects);
  const setSoundEffects = useSettingsStore((s) => s.setSoundEffects);
  const dailyReminders = useSettingsStore((s) => s.dailyReminders);
  const setDailyReminders = useSettingsStore((s) => s.setDailyReminders);
  const advancedMarksProjectionEnabled = useSettingsStore(
    (s) => s.advancedMarksProjectionEnabled,
  );
  const setAdvancedMarksProjectionEnabled = useSettingsStore(
    (s) => s.setAdvancedMarksProjectionEnabled,
  );

  return (
    <SettingsExpandableSection
      sectionId="preferences-theme-home"
      title="Theme and Home"
      description="Theme, exam countdown, projected marks, sound effects, and daily reminder nudges. Voice commands use the microphone when you tap it — there is no always-on listening."
      icon={Palette}
    >
      <div className="kal-glass-panel divide-y divide-white/15 rounded-[1rem] px-1 dark:divide-white/10">
      <div className="px-3 py-4">
        <span className="text-[15px] font-medium text-kal-text">Theme</span>
        <p className="mt-0.5 text-xs text-kal-text-secondary">
          Choose how Kalnehi looks.
        </p>
        <div
          className="kal-glass-subtle mt-3 flex flex-wrap gap-1 rounded-xl p-1 sm:flex-nowrap"
          role="group"
          aria-label="Theme"
        >
          {APPEARANCE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAppearance(value)}
              className={clsx(
                "min-h-[40px] flex-1 rounded-lg text-xs font-semibold transition-colors",
                appearance === value
                  ? "bg-white/95 text-kal-text shadow-sm backdrop-blur-sm dark:bg-zinc-800/95"
                  : "text-kal-text-secondary hover:text-kal-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-kal-text">
              Exam countdown
            </span>
            <ToggleStateBadge checked={showCountdown} />
          </div>
          <p className="mt-0.5 text-xs text-kal-text-secondary">
            Shows the Kalnehi Eye exam countdown widget on Home.
          </p>
        </div>
        <SheetSwitch
          checked={showCountdown}
          onChange={setShowCountdown}
          id={`${baseId}-e`}
          label="Toggle exam countdown"
        />
      </div>
      <div className="flex items-center justify-between gap-3 p-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-kal-text">
              Projected marks estimate
            </span>
            <ToggleStateBadge checked={advancedMarksProjectionEnabled} />
          </div>
          <p className="mt-0.5 text-xs text-kal-text-secondary">
            When on, Home and Progress show estimated marks from your study trend.
            When off, only syllabus completion is shown.
          </p>
        </div>
        <SheetSwitch
          checked={advancedMarksProjectionEnabled}
          onChange={setAdvancedMarksProjectionEnabled}
          id={`${baseId}-marks`}
          label="Toggle projected marks estimate"
        />
      </div>
      <div className="flex items-center justify-between gap-3 p-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-kal-text">
              Sound effects
            </span>
            <ToggleStateBadge checked={soundEffects} />
          </div>
          <p className="mt-0.5 text-xs text-kal-text-secondary">
            Plays small UI sounds for actions and feedback.
          </p>
        </div>
        <SheetSwitch
          checked={soundEffects}
          onChange={setSoundEffects}
          id={`${baseId}-s`}
          label="Toggle sound effects"
        />
      </div>
      <div className="flex items-center justify-between gap-3 p-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-kal-text">
              Daily reminder nudges
            </span>
            <ToggleStateBadge checked={dailyReminders} />
          </div>
          <p className="mt-0.5 text-xs text-kal-text-secondary">
            Allows daily reminder nudges. You can customize times below in
            Notifications.
          </p>
        </div>
        <SheetSwitch
          checked={dailyReminders}
          onChange={setDailyReminders}
          id={`${baseId}-r`}
          label="Toggle daily reminder nudges"
        />
      </div>
    </div>
    </SettingsExpandableSection>
  );
}
