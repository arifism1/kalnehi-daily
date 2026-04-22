interface FeatureBlockProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  scenario?: string;
  tag?: string;
}

export function FeatureBlock({ icon, title, description, scenario, tag }: FeatureBlockProps) {
  return (
    <div className="kal-glass-card rounded-2xl p-5 space-y-3">
      {tag && (
        <span className="inline-block rounded-full bg-kal-accent-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kal-accent-dark">
          {tag}
        </span>
      )}
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 shrink-0 text-kal-accent" aria-hidden>
            {icon}
          </div>
        )}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-kal-text">{title}</h3>
          <p className="text-sm leading-relaxed text-kal-text-secondary">{description}</p>
        </div>
      </div>
      {scenario && (
        <blockquote className="border-l-2 border-kal-accent/40 pl-3 text-sm italic leading-relaxed text-kal-text-secondary">
          {scenario}
        </blockquote>
      )}
    </div>
  );
}
