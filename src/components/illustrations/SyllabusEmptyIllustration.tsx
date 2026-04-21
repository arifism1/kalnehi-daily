export function SyllabusEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Open book base */}
      <path
        d="M20 60 L20 165 Q20 170 25 170 L105 170 L105 60 Q105 55 100 55 L25 55 Q20 55 20 60Z"
        fill="#FFF0E3"
        stroke="#FF7A00"
        strokeWidth="2"
      />
      <path
        d="M200 60 L200 165 Q200 170 195 170 L115 170 L115 60 Q115 55 120 55 L195 55 Q200 55 200 60Z"
        fill="#FFF8F2"
        stroke="#FF7A00"
        strokeWidth="2"
      />
      {/* Spine */}
      <rect x="103" y="55" width="14" height="115" rx="3" fill="#E8D5B7" />
      <rect x="108" y="55" width="4" height="115" fill="#C9A97A" opacity="0.5" />

      {/* Left page lines */}
      <rect x="30" y="72" width="62" height="4" rx="2" fill="#FFD4A8" opacity="0.8" />
      <rect x="30" y="82" width="55" height="4" rx="2" fill="#FFD4A8" opacity="0.6" />
      <rect x="30" y="92" width="60" height="4" rx="2" fill="#FFD4A8" opacity="0.7" />
      <rect x="30" y="102" width="48" height="4" rx="2" fill="#FFD4A8" opacity="0.5" />
      <rect x="30" y="112" width="58" height="4" rx="2" fill="#FFD4A8" opacity="0.6" />
      <rect x="30" y="122" width="45" height="4" rx="2" fill="#FFD4A8" opacity="0.4" />
      <rect x="30" y="132" width="62" height="4" rx="2" fill="#FFD4A8" opacity="0.5" />

      {/* Right page lines */}
      <rect x="126" y="72" width="62" height="4" rx="2" fill="#E8D5B7" opacity="0.7" />
      <rect x="126" y="82" width="50" height="4" rx="2" fill="#E8D5B7" opacity="0.5" />
      <rect x="126" y="92" width="58" height="4" rx="2" fill="#E8D5B7" opacity="0.6" />
      <rect x="126" y="102" width="44" height="4" rx="2" fill="#E8D5B7" opacity="0.4" />
      <rect x="126" y="112" width="62" height="4" rx="2" fill="#E8D5B7" opacity="0.5" />

      {/* Bottom shadow */}
      <ellipse cx="110" cy="172" rx="80" ry="6" fill="#E8D5B7" opacity="0.4" />

      {/* Floating subject badges */}
      {/* Physics */}
      <circle cx="48" cy="36" r="18" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="1.5" />
      <text x="48" y="40" textAnchor="middle" fontSize="13" fill="#FF7A00">⚛</text>

      {/* Chemistry */}
      <circle cx="110" cy="22" r="18" fill="#E8F5E9" stroke="#5A9E6F" strokeWidth="1.5" />
      <text x="110" y="26" textAnchor="middle" fontSize="13" fill="#5A9E6F">⚗</text>

      {/* Math */}
      <circle cx="172" cy="36" r="18" fill="#EEF2FF" stroke="#4A90D9" strokeWidth="1.5" />
      <text x="172" y="40" textAnchor="middle" fontSize="14" fill="#4A90D9">∑</text>

      {/* Question mark overlay */}
      <circle cx="110" cy="125" r="22" fill="#FF7A00" opacity="0.12" />
      <text x="110" y="133" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#FF7A00" opacity="0.35">?</text>

      {/* Sparkle */}
      <path d="M186 100 L187.5 106 L194 107.5 L187.5 109 L186 115 L184.5 109 L178 107.5 L184.5 106Z"
        fill="#FF7A00" opacity="0.5" />
      <path d="M26 142 L27 146 L31 147 L27 148 L26 152 L25 148 L21 147 L25 146Z"
        fill="#FFB366" opacity="0.5" />
    </svg>
  );
}
