"use client";

import clsx from "clsx";
import { Palette } from "lucide-react";
import { useId } from "react";

import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";
import {
  type AppearanceMode,
  useSettingsStore,
} from "@/store/useSettingsStore";

const APPEARANCE_OPTIONS: { value: AppearanceMode; label: string }[] = [
  { value: "light", label: "Orange theme" },
  { value: "dark", label: "Coffee theme" },
  { value: "system", label: "Match device" },
];

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
        <SettingsToggleRow
          label="Exam countdown"
          description="Shows the Kalnehi Eye exam countdown widget on Home."
          checked={showCountdown}
          onChange={setShowCountdown}
          switchId={`${baseId}-e`}
          switchLabel="Toggle exam countdown"
        />
        <SettingsToggleRow
          label="Projected marks estimate"
          description="When on, Home and Progress show estimated marks from your study trend. When off, only syllabus completion is shown."
          checked={advancedMarksProjectionEnabled}
          onChange={setAdvancedMarksProjectionEnabled}
          switchId={`${baseId}-marks`}
          switchLabel="Toggle projected marks estimate"
        />
        <SettingsToggleRow
          label="Sound effects"
          description="Plays small UI sounds for actions and feedback."
          checked={soundEffects}
          onChange={setSoundEffects}
          switchId={`${baseId}-s`}
          switchLabel="Toggle sound effects"
        />
        <SettingsToggleRow
          label="Daily reminder nudges"
          description="Allows daily reminder nudges. You can customize times below in Notifications."
          checked={dailyReminders}
          onChange={setDailyReminders}
          switchId={`${baseId}-r`}
          switchLabel="Toggle daily reminder nudges"
        />
      </div>
    </SettingsExpandableSection>
  );
}
