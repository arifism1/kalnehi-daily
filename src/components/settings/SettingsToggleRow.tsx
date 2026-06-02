"use client";

import clsx from "clsx";

import { SettingsSheetSwitch } from "@/components/settings/SettingsSheetSwitch";

export function SettingsToggleStateBadge({ checked }: { checked: boolean }) {
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

type SettingsToggleRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  switchId: string;
  switchLabel: string;
  disabled?: boolean;
};

export function SettingsToggleRow({
  label,
  description,
  checked,
  onChange,
  switchId,
  switchLabel,
  disabled,
}: SettingsToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-medium text-kal-text">{label}</span>
          <SettingsToggleStateBadge checked={checked} />
        </div>
        {description ? (
          <p className="mt-0.5 text-xs text-kal-text-secondary">{description}</p>
        ) : null}
      </div>
      <SettingsSheetSwitch
        id={switchId}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
