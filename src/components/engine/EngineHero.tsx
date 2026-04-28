import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  /** Renders beside the title (e.g. small illustrative icon). */
  titleAccessory?: ReactNode;
};

export function EngineHero({
  eyebrow,
  title,
  description,
  titleAccessory,
}: Props) {
  return (
    <header className="space-y-2">
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
        {eyebrow}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="kal-feature-title">{title}</h1>
        {titleAccessory}
      </div>
      <p className="kal-feature-lead max-w-2xl">{description}</p>
    </header>
  );
}

export function EngineCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`kal-glass-panel rounded-[1rem] p-5 sm:p-6 ${className ?? ""}`}
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-kal-text-secondary">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
