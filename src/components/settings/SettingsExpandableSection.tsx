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
  /** When false, header is not a toggle — content stays visible (no chevron). */
  expandable?: boolean;
  defaultOpen?: boolean;
  /** Rendered on the header row (e.g. inline switch), before the chevron. */
  headerTrailing?: ReactNode;
  /** Optional id on the root article (deep links). */
  anchorId?: string;
  className?: string;
  children: ReactNode;
};

function SectionHeaderTitles({
  kicker,
  title,
  description,
  Icon,
}: {
  kicker?: string;
  title: string;
  description?: string;
  Icon?: ExpandableIcon;
}) {
  return (
    <span className="flex min-w-0 items-start gap-3">
      {Icon ? (
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-kal-accent/15 text-kal-accent">
          <Icon className="size-4" aria-hidden />
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
  );
}

export function SettingsExpandableSection({
  sectionId,
  title,
  kicker,
  description,
  icon: Icon,
  expandable = true,
  defaultOpen = false,
  headerTrailing,
  anchorId,
  className,
  children,
}: SettingsExpandableSectionProps) {
  const uid = useId();
  const [open, setOpen] = useState(defaultOpen);
  const buttonId = `${sectionId}-${uid}-button`;
  const panelId = `${sectionId}-${uid}-panel`;

  if (!expandable) {
    return (
      <article
        id={anchorId}
        className={clsx(
          "overflow-hidden rounded-xl border border-kal-border/60 bg-kal-card/40",
          anchorId && "scroll-mt-24",
          className,
        )}
      >
        <div className="p-3 sm:px-4">
          <SectionHeaderTitles
            Icon={Icon}
            kicker={kicker}
            title={title}
            description={description}
          />
        </div>
        <div className="border-t border-kal-border/60 p-3 sm:p-4">{children}</div>
      </article>
    );
  }

  return (
    <article
      id={anchorId}
      className={clsx(
        "overflow-hidden rounded-xl border border-kal-border/60 bg-kal-card/40",
        anchorId && "scroll-mt-24",
        className,
      )}
    >
      <div className="flex items-center gap-2 p-3 sm:px-4">
        <h3 className="min-w-0 flex-1">
          <button
            id={buttonId}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <SectionHeaderTitles
              Icon={Icon}
              kicker={kicker}
              title={title}
              description={description}
            />
            {!headerTrailing ? (
              <ChevronDown
                className={clsx(
                  "mt-0.5 size-4.5 shrink-0 text-kal-muted transition-transform duration-300",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            ) : null}
          </button>
        </h3>
        {headerTrailing ? (
          <div className="flex shrink-0 items-center gap-2">
            {headerTrailing}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={open ? "Collapse section" : "Expand section"}
              onClick={() => setOpen((prev) => !prev)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-kal-muted hover:text-kal-text"
            >
              <ChevronDown
                className={clsx(
                  "size-4.5 transition-transform duration-300",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          </div>
        ) : null}
      </div>
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
