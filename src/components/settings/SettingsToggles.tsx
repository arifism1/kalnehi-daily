"use client";

import clsx from "clsx";
import { useId } from "react";

import { useSettingsStore } from "@/store/useSettingsStore";

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
        checked ? "bg-emerald-500" : "bg-zinc-600",
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

export function SettingsToggles() {
  const baseId = useId();

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
    <div className="divide-y divide-slate-700/80 rounded-2xl border border-slate-700/80 bg-slate-900/30 px-1">
      <div className="flex items-center justify-between gap-3 px-3 py-3.5">
        <div>
          <span className="text-[15px] font-medium text-zinc-100">
            Purpose mode
          </span>
          <p className="mt-0.5 text-xs text-zinc-500">
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
          <span className="text-[15px] font-medium text-zinc-100">
            Show countdown
          </span>
          <p className="mt-0.5 text-xs text-zinc-500">
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
          <span className="text-[15px] font-medium text-zinc-100">
            Enable Advanced Marks Projection
          </span>
          <p className="mt-0.5 text-xs text-zinc-500">
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
        <span className="text-[15px] font-medium text-zinc-100">
          Sound effects
        </span>
        <SheetSwitch
          checked={soundEffects}
          onChange={setSoundEffects}
          id={`${baseId}-s`}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3.5">
        <span className="text-[15px] font-medium text-zinc-100">
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
