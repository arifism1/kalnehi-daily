const TRUST_SIGNALS = [
  { icon: "🔒", text: "On-device only — nothing uploaded" },
  { icon: "📲", text: "PWA — installs like a native app" },
  { icon: "📶", text: "Works offline" },
  { icon: "💳", text: "UPI & cards accepted" },
  { icon: "✕", text: "Cancel anytime" },
  { icon: "📱", text: "Android, iOS & desktop" },
] as const;

export function SocialProofStrip() {
  return (
    <div className="border-y border-kal-border bg-white/60 py-5 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-kal-muted">
            For all Indian &amp; international competitive exam aspirants
          </p>
          <span className="hidden h-3 w-px bg-kal-border sm:block" aria-hidden />
          {TRUST_SIGNALS.map(({ icon, text }) => (
            <span
              key={text}
              className="flex items-center gap-1.5 text-xs font-medium text-kal-text-secondary"
            >
              <span className="text-sm" aria-hidden>{icon}</span>
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
