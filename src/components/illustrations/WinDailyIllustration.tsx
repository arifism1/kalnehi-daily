export function WinDailyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF7A00" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF7A00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8F0" />
          <stop offset="100%" stopColor="#FFE0C0" />
        </linearGradient>
        <linearGradient id="mountainGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8D5B7" />
          <stop offset="100%" stopColor="#C9A97A" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="480" height="220" fill="url(#skyGrad)" />

      {/* Sun glow */}
      <circle cx="240" cy="95" r="80" fill="url(#sunGlow)" />

      {/* Sun */}
      <circle cx="240" cy="95" r="32" fill="#FF7A00" opacity="0.9" />
      <circle cx="240" cy="95" r="24" fill="#FF9A33" />

      {/* Sun rays */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        const x1 = 240 + Math.cos(angle) * 38;
        const y1 = 95 + Math.sin(angle) * 38;
        const x2 = 240 + Math.cos(angle) * 52;
        const y2 = 95 + Math.sin(angle) * 52;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FF7A00" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        );
      })}

      {/* Background mountains */}
      <path d="M0 180 L80 110 L160 155 L240 90 L320 145 L400 105 L480 150 L480 220 L0 220Z" fill="#E8D5B7" opacity="0.4" />

      {/* Main mountains */}
      <path d="M0 200 L100 130 L200 170 L300 120 L400 160 L480 135 L480 220 L0 220Z" fill="url(#mountainGrad)" opacity="0.7" />

      {/* Foreground ground */}
      <path d="M0 205 Q120 195 240 200 Q360 205 480 198 L480 220 L0 220Z" fill="#C9A97A" opacity="0.5" />

      {/* Horizon line glow */}
      <rect x="0" y="190" width="480" height="3" fill="#FF7A00" opacity="0.15" />

      {/* Small stars/dots */}
      <circle cx="60" cy="40" r="2" fill="#FF7A00" opacity="0.4" />
      <circle cx="120" cy="25" r="1.5" fill="#FF7A00" opacity="0.3" />
      <circle cx="380" cy="30" r="2" fill="#FF7A00" opacity="0.35" />
      <circle cx="430" cy="55" r="1.5" fill="#FF7A00" opacity="0.3" />

      {/* Clouds */}
      <ellipse cx="80" cy="70" rx="40" ry="14" fill="white" opacity="0.6" />
      <ellipse cx="65" cy="68" rx="22" ry="12" fill="white" opacity="0.5" />
      <ellipse cx="100" cy="68" rx="22" ry="12" fill="white" opacity="0.5" />

      <ellipse cx="400" cy="60" rx="36" ry="12" fill="white" opacity="0.5" />
      <ellipse cx="385" cy="58" rx="20" ry="10" fill="white" opacity="0.4" />
      <ellipse cx="416" cy="58" rx="20" ry="10" fill="white" opacity="0.4" />
    </svg>
  );
}
