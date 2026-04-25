export function PrepBrainIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Robot body */}
      <rect x="76" y="108" width="88" height="72" rx="14" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="2" />

      {/* Robot head */}
      <rect x="68" y="52" width="104" height="64" rx="18" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="2" />

      {/* Antenna */}
      <rect x="118" y="32" width="4" height="22" rx="2" fill="#FF7A00" opacity="0.8" />
      <circle cx="120" cy="28" r="7" fill="#FF7A00" />
      <circle cx="120" cy="28" r="4" fill="#FFD4A8" />

      {/* Eyes */}
      <rect x="84" y="72" width="24" height="18" rx="8" fill="#FF7A00" opacity="0.15" />
      <circle cx="96" cy="81" r="8" fill="#FF7A00" opacity="0.9" />
      <circle cx="99" cy="78" r="3" fill="white" opacity="0.8" />

      <rect x="132" y="72" width="24" height="18" rx="8" fill="#FF7A00" opacity="0.15" />
      <circle cx="144" cy="81" r="8" fill="#FF7A00" opacity="0.9" />
      <circle cx="147" cy="78" r="3" fill="white" opacity="0.8" />

      {/* Smile */}
      <path d="M100 100 Q120 112 140 100" stroke="#CC6200" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Robot arms */}
      <rect x="46" y="118" width="32" height="12" rx="6" fill="#FFD4A8" stroke="#FF7A00" strokeWidth="1.5" />
      <rect x="162" y="118" width="32" height="12" rx="6" fill="#FFD4A8" stroke="#FF7A00" strokeWidth="1.5" />

      {/* Chest panel */}
      <rect x="92" y="122" width="56" height="44" rx="8" fill="#FFE5CC" />
      {/* Circuit lines on chest */}
      <line x1="100" y1="133" x2="140" y2="133" stroke="#FF7A00" strokeWidth="1" opacity="0.5" />
      <line x1="100" y1="141" x2="128" y2="141" stroke="#FF7A00" strokeWidth="1" opacity="0.4" />
      <line x1="100" y1="149" x2="136" y2="149" stroke="#FF7A00" strokeWidth="1" opacity="0.4" />
      <circle cx="140" cy="141" r="3" fill="#FF7A00" opacity="0.5" />
      <circle cx="130" cy="155" r="2.5" fill="#FF7A00" opacity="0.4" />

      {/* Lightbulb in hand (left) */}
      <ellipse cx="38" cy="108" rx="16" ry="20" fill="#FFF9C4" stroke="#FFD700" strokeWidth="1.5" />
      <path d="M30 112 Q38 108 46 112" stroke="#FFD700" strokeWidth="1" fill="none" />
      <path d="M30 116 Q38 112 46 116" stroke="#FFD700" strokeWidth="1" fill="none" />
      <rect x="33" y="124" width="10" height="6" rx="2" fill="#FFD700" />
      {/* Bulb glow */}
      <ellipse cx="38" cy="100" rx="10" ry="8" fill="#FFD700" opacity="0.3" />

      {/* Chat bubble */}
      <rect x="166" y="42" width="64" height="42" rx="10" fill="#FF7A00" />
      <path d="M166 68 L156 74 L172 68" fill="#FF7A00" />
      <text x="198" y="60" textAnchor="middle" fontSize="8" fill="white" fontWeight="600">Hello!</text>
      <text x="198" y="72" textAnchor="middle" fontSize="7" fill="white" opacity="0.9">I'm Mastermind</text>
      <text x="198" y="80" textAnchor="middle" fontSize="7" fill="white" opacity="0.8">your AI coach</text>

      {/* Floating sparkles */}
      <path d="M28 62 L30 70 L38 72 L30 74 L28 82 L26 74 L18 72 L26 70Z" fill="#FF7A00" opacity="0.4" />
      <path d="M208 126 L209.5 132 L216 133.5 L209.5 135 L208 141 L206.5 135 L200 133.5 L206.5 132Z"
        fill="#FFB366" opacity="0.5" />
      <circle cx="52" cy="164" r="3" fill="#FF7A00" opacity="0.3" />
      <circle cx="192" cy="168" r="2.5" fill="#FFB366" opacity="0.3" />
    </svg>
  );
}
