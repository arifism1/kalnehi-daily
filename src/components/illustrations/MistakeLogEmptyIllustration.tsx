export function MistakeLogEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="mistakeGlow" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FF7A00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bulbGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFBE6" />
          <stop offset="100%" stopColor="#FFE9A0" />
        </linearGradient>
      </defs>

      {/* Background glow */}
      <ellipse cx="140" cy="95" rx="90" ry="75" fill="url(#mistakeGlow)" />

      {/* Lightbulb glass */}
      <path
        d="M140 40 C118 40 102 56 102 76 C102 92 112 104 118 112 L118 124 L162 124 L162 112 C168 104 178 92 178 76 C178 56 162 40 140 40Z"
        fill="url(#bulbGrad)" stroke="#FFD700" strokeWidth="2"
      />
      {/* Filament glow inside */}
      <ellipse cx="140" cy="85" rx="22" ry="22" fill="#FFD700" opacity="0.2" />
      {/* Filament */}
      <path
        d="M128 92 Q128 82 134 78 Q140 74 146 78 Q152 82 152 92"
        stroke="#FFB300" strokeWidth="2" fill="none" strokeLinecap="round"
      />
      <path
        d="M132 92 Q132 86 140 82 Q148 86 148 92"
        stroke="#FF8C00" strokeWidth="1.5" fill="none" strokeLinecap="round"
      />

      {/* Metal base rings */}
      <rect x="118" y="124" width="44" height="8" rx="3" fill="#FFD4A8" stroke="#FFB366" strokeWidth="1" />
      <rect x="121" y="132" width="38" height="7" rx="3" fill="#FFCB99" stroke="#FFB366" strokeWidth="1" />
      <rect x="124" y="139" width="32" height="6" rx="3" fill="#FFB366" stroke="#FF9A33" strokeWidth="1" />

      {/* Eraser — below and to the right */}
      <rect x="152" y="152" width="52" height="22" rx="5" fill="#FF8C8C" stroke="#FF6B6B" strokeWidth="1.5" transform="rotate(-8 178 163)" />
      <rect x="152" y="152" width="14" height="22" rx="5" fill="#FFB3B3" stroke="#FF8C8C" strokeWidth="1" transform="rotate(-8 178 163)" />
      {/* Eraser band */}
      <rect x="166" y="152" width="3" height="22" fill="#CC4444" opacity="0.5" transform="rotate(-8 178 163)" />
      {/* Eraser shavings */}
      <ellipse cx="164" cy="172" rx="6" ry="3" fill="#FFCB99" opacity="0.6" transform="rotate(-8 164 172)" />
      <ellipse cx="172" cy="175" rx="4" ry="2" fill="#FFD4A8" opacity="0.5" transform="rotate(5 172 175)" />

      {/* Ray lines from bulb */}
      {[
        [-42, -28], [-50, 0], [-44, 26],
        [42, -28], [50, 0], [44, 26],
      ].map(([dx, dy], i) => (
        <line
          key={i}
          x1={140 + dx! * 0.55}
          y1={76 + dy! * 0.55}
          x2={140 + dx!}
          y2={76 + dy!}
          stroke="#FFD700"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.45"
        />
      ))}

      {/* Small star sparkle top right */}
      <path d="M206 50 L208 56 L214 58 L208 60 L206 66 L204 60 L198 58 L204 56Z" fill="#FF7A00" opacity="0.4" />
      <circle cx="74" cy="64" r="2.5" fill="#FFD700" opacity="0.4" />
      <circle cx="220" cy="130" r="2" fill="#FFB366" opacity="0.4" />
    </svg>
  );
}
