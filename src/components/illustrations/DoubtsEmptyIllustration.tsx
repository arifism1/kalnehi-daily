export function DoubtsEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Question bubble (left) */}
      <rect x="14" y="30" width="84" height="72" rx="14" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="1.5" />
      <path d="M14 82 L8 96 L30 88" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="1.5" strokeLinejoin="round" />
      <text x="56" y="76" textAnchor="middle" fontSize="38" fill="#FF7A00" fontWeight="bold" opacity="0.7">?</text>

      {/* Arrow transformation */}
      <path d="M102 66 L118 66" stroke="#FF7A00" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M114 60 L120 66 L114 72" stroke="#FF7A00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Lightbulb (right) */}
      <ellipse cx="152" cy="58" rx="26" ry="30" fill="#FFF9C4" stroke="#FFD700" strokeWidth="1.5" />
      <ellipse cx="152" cy="52" rx="18" ry="22" fill="#FFD700" opacity="0.3" />
      {/* Bulb base lines */}
      <path d="M138 74 Q138 82 152 82 Q166 82 166 74" stroke="#FFD700" strokeWidth="1.5" fill="none" />
      <path d="M138 80 Q138 86 152 86 Q166 86 166 80" stroke="#FFD700" strokeWidth="1.5" fill="none" />
      <rect x="143" y="86" width="18" height="8" rx="4" fill="#FFD700" />
      {/* Shine */}
      <line x1="152" y1="22" x2="152" y2="14" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="170" y1="28" x2="176" y2="22" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="134" y1="28" x2="128" y2="22" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="178" y1="46" x2="186" y2="44" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="126" y1="46" x2="118" y2="44" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

      {/* Glow around lightbulb */}
      <ellipse cx="152" cy="58" rx="34" ry="38" stroke="#FFD700" strokeWidth="1" fill="none" opacity="0.25" />

      {/* Small stars */}
      <path d="M12 140 L13.5 146 L20 147.5 L13.5 149 L12 155 L10.5 149 L4 147.5 L10.5 146Z"
        fill="#FF7A00" opacity="0.4" />
      <path d="M180 126 L181.5 132 L188 133.5 L181.5 135 L180 141 L178.5 135 L172 133.5 L178.5 132Z"
        fill="#FFB366" opacity="0.4" />
      <circle cx="30" cy="150" r="3" fill="#FFD4A8" opacity="0.5" />
      <circle cx="170" cy="150" r="3" fill="#FFD4A8" opacity="0.5" />

      {/* Label */}
      <text x="100" y="162" textAnchor="middle" fontSize="9" fill="#8A7560" fontWeight="600" letterSpacing="1">
        Track your doubts here
      </text>
    </svg>
  );
}
