"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

type ExpandableIcon = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

type SettingsExpandableSectionProps = {
  sectionId: string;
  title: string;
  kicker?: string;
  description?: string;
  icon?: ExpandableIcon;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function SettingsExpandableSection({
  sectionId,
  title,
  kicker,
  description,
  icon: Icon,
  defaultOpen = false,
  className,
  children,
}: SettingsExpandableSectionProps) {
  const uid = useId();
  const [open, setOpen] = useState(defaultOpen);
  const buttonId = `${sectionId}-${uid}-button`;
  const panelId = `${sectionId}-${uid}-panel`;

  return (
    <article
      className={clsx(
        "overflow-hidden rounded-xl border border-kal-border/60 bg-kal-card/40",
        className,
      )}
    >
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left sm:px-4"
        >
          <span className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-kal-accent/15 text-kal-accent">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            ) : null}
            <span className="min-w-0">
              {kicker ? (
                <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-kal-accent">
                  {kicker}
                </span>
              ) : null}
              <span className="block text-sm font-semibold text-kal-text sm:text-[0.96rem]">
                {title}
              </span>
              {description ? (
                <span className="mt-0.5 block text-xs leading-relaxed text-kal-text-secondary">
                  {description}
                </span>
              ) : null}
            </span>
          </span>
          <ChevronDown
            className={clsx(
              "mt-0.5 h-4.5 w-4.5 shrink-0 text-kal-muted transition-transform duration-300",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={clsx(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-kal-border/60 p-3 sm:p-4">{open ? children : null}</div>
        </div>
      </div>
    </article>
  );
}
