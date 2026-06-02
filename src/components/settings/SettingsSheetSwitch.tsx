"use client";

import clsx from "clsx";

export type SettingsSheetSwitchSize = "md" | "sm";

export function SettingsSheetSwitch({
  checked,
  onChange,
  disabled,
  id,
  ariaLabel,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id: string;
  ariaLabel?: string;
  size?: SettingsSheetSwitchSize;
}) {
  const sm = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={clsx(
        "relative shrink-0 rounded-full transition-[background-color] duration-200",
        sm ? "h-8 w-12" : "h-9 w-14",
        disabled ? "cursor-not-allowed opacity-50" : "",
        checked ? "bg-kal-accent" : "bg-kal-border",
      )}
    >
      <span
        className={clsx(
          "absolute rounded-full bg-white shadow transition-transform duration-200",
          sm ? "top-0.5 left-0.5 size-7" : "top-1 left-1 size-7",
          checked
            ? sm
              ? "translate-x-[1.1rem]"
              : "translate-x-[1.35rem]"
            : "translate-x-0",
        )}
      />
    </button>
  );
}
