import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
};

export function EngineHero({ eyebrow, title, description }: Props) {
  return (
    <header className="space-y-2">
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-400/90">
        {eyebrow}
      </p>
      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
        {title}
      </h1>
      <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
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
      className={`rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 shadow-inner shadow-black/20 sm:p-5 ${className ?? ""}`}
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
