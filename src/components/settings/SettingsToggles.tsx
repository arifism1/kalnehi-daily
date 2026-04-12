"use client";

import clsx from "clsx";
import { useId } from "react";

import {
  type AppearanceMode,
  useSettingsStore,
} from "@/store/useSettingsStore";

function SheetSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-9 w-14 shrink-0 rounded-full transition-[background-color] duration-200",
        checked ? "bg-kal-accent" : "bg-kal-border",
      )}
    >
      <span
        className={clsx(
          "absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[1.35rem]" : "translate-x-0",
        )}
      />
    </button>
  );
}

const APPEARANCE_OPTIONS: { value: AppearanceMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
];

export function SettingsToggles() {
  const baseId = useId();

  const appearance = useSettingsStore((s) => s.appearance ?? "light");
  const setAppearance = useSettingsStore((s) => s.setAppearance);
  const purposeModeEnabled = useSettingsStore((s) => s.purposeModeEnabled);
  const setPurposeModeEnabled = useSettingsStore((s) => s.setPurposeModeEnabled);
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
    <div className="kal-glass-panel divide-y divide-white/15 rounded-[1rem] px-1 dark:divide-white/10">
      <div className="px-3 py-4">
        <span className="text-[15px] font-medium text-kal-text">Appearance</span>
        <p className="mt-0.5 text-xs text-kal-text-secondary">
          Light is default; System follows your device.
        </p>
        <div
          className="kal-glass-subtle mt-3 flex gap-1 rounded-xl p-1"
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
      <div className="flex items-center justify-between gap-3 px-3 py-3.5">
        <div>
          <span className="text-[15px] font-medium text-kal-text">
            Purpose mode
          </span>
          <p className="mt-0.5 text-xs text-kal-text-secondary">
            Photos &amp; motivation strip on home
          </p>
        </div>
        <SheetSwitch
          checked={purposeModeEnabled}
          onChange={setPurposeModeEnabled}
          id={`${baseId}-p`}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3.5">
        <div>
          <span className="text-[15px] font-medium text-kal-text">
            Show countdown
          </span>
          <p className="mt-0.5 text-xs text-kal-text-secondary">
            Kalnehi Eye — exam countdown on home
          </p>
        </div>
        <SheetSwitch
          checked={showCountdown}
          onChange={setShowCountdown}
          id={`${baseId}-e`}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3.5">
        <div>
          <span className="text-[15px] font-medium text-kal-text">
            Enable Advanced Marks Projection
          </span>
          <p className="mt-0.5 text-xs text-kal-text-secondary">
            When off, home and progress show syllabus completion % only (no
            projected marks).
          </p>
        </div>
        <SheetSwitch
          checked={advancedMarksProjectionEnabled}
          onChange={setAdvancedMarksProjectionEnabled}
          id={`${baseId}-marks`}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3.5">
        <span className="text-[15px] font-medium text-kal-text">
          Sound effects
        </span>
        <SheetSwitch
          checked={soundEffects}
          onChange={setSoundEffects}
          id={`${baseId}-s`}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3.5">
        <span className="text-[15px] font-medium text-kal-text">
          Daily reminders
        </span>
        <SheetSwitch
          checked={dailyReminders}
          onChange={setDailyReminders}
          id={`${baseId}-r`}
        />
      </div>
    </div>
  );
}
