export function MissedTasksEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Calendar base */}
      <rect x="24" y="32" width="132" height="108" rx="10" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="2" />
      {/* Calendar header */}
      <rect x="24" y="32" width="132" height="28" rx="10" fill="#FF7A00" />
      <rect x="24" y="48" width="132" height="12" fill="#FF7A00" />
      {/* Calendar rings */}
      <rect x="54" y="24" width="8" height="18" rx="4" fill="#CC6200" />
      <rect x="118" y="24" width="8" height="18" rx="4" fill="#CC6200" />
      {/* Header text */}
      <text x="90" y="51" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">All clear!</text>

      {/* Grid lines */}
      <line x1="24" y1="76" x2="156" y2="76" stroke="#FFD4A8" strokeWidth="1" />
      <line x1="24" y1="100" x2="156" y2="100" stroke="#FFD4A8" strokeWidth="1" />
      <line x1="24" y1="124" x2="156" y2="124" stroke="#FFD4A8" strokeWidth="1" />

      {/* Crossed out old tasks (red) - showing that they're done */}
      <rect x="34" y="82" width="40" height="10" rx="3" fill="#FFE0E0" />
      <line x1="34" y1="87" x2="74" y2="87" stroke="#FF4444" strokeWidth="1.5" opacity="0.6" />
      <rect x="80" y="82" width="36" height="10" rx="3" fill="#FFE0E0" />
      <line x1="80" y1="87" x2="116" y2="87" stroke="#FF4444" strokeWidth="1.5" opacity="0.6" />

      {/* Checkmark overlay on old tasks */}
      <circle cx="130" cy="87" r="10" fill="#5A9E6F" />
      <path d="M124 87 L129 92 L137 82" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Today: Clean slate */}
      <rect x="34" y="107" width="88" height="10" rx="3" fill="#E8F5E9" />
      <text x="78" y="115" textAnchor="middle" fontSize="7" fill="#5A9E6F" fontWeight="600">Start fresh today</text>

      {/* Big checkmark badge */}
      <circle cx="136" cy="110" r="14" fill="#FF7A00" />
      <path d="M129 110 L134 115 L143 104" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Sparkles */}
      <path d="M16 60 L17.5 66 L24 67.5 L17.5 69 L16 75 L14.5 69 L8 67.5 L14.5 66Z"
        fill="#FF7A00" opacity="0.4" />
      <path d="M158 90 L159.5 96 L166 97.5 L159.5 99 L158 105 L156.5 99 L150 97.5 L156.5 96Z"
        fill="#FFB366" opacity="0.4" />
      <circle cx="20" cy="100" r="3" fill="#FFD4A8" opacity="0.5" />
    </svg>
  );
}
