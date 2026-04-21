export function NotificationsEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Bell body */}
      <path
        d="M100 30 C72 30 54 52 54 78 L54 108 L42 120 L42 128 L158 128 L158 120 L146 108 L146 78 C146 52 128 30 100 30Z"
        fill="#FFF0E3"
        stroke="#FF7A00"
        strokeWidth="2.5"
      />
      {/* Bell clapper */}
      <circle cx="100" cy="140" r="10" fill="#FF7A00" opacity="0.8" />
      <rect x="97" y="128" width="6" height="14" rx="3" fill="#FF7A00" opacity="0.6" />

      {/* Bell top */}
      <rect x="94" y="20" width="12" height="12" rx="6" fill="#FF7A00" opacity="0.9" />
      <rect x="88" y="27" width="24" height="5" rx="2.5" fill="#FF7A00" opacity="0.7" />

      {/* Sparkles around bell */}
      {/* Top left sparkle */}
      <path d="M56 44 L57.8 50 L64 51.8 L57.8 53.6 L56 60 L54.2 53.6 L48 51.8 L54.2 50Z"
        fill="#FF7A00" opacity="0.7" />
      {/* Top right sparkle */}
      <path d="M144 38 L145.5 43 L150.5 44.5 L145.5 46 L144 51 L142.5 46 L137.5 44.5 L142.5 43Z"
        fill="#FFB366" opacity="0.8" />
      {/* Right sparkle */}
      <path d="M160 76 L161 80 L165 81 L161 82 L160 86 L159 82 L155 81 L159 80Z"
        fill="#FF7A00" opacity="0.5" />
      {/* Left small dot */}
      <circle cx="42" cy="80" r="4" fill="#FFD4A8" />
      <circle cx="36" cy="68" r="2.5" fill="#FFB366" opacity="0.5" />
      <circle cx="164" cy="64" r="3" fill="#FFD4A8" opacity="0.7" />

      {/* Small motion lines (gentle ring effect) */}
      <path d="M34 56 Q28 72 34 90" stroke="#FF7A00" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.3" />
      <path d="M166 56 Q172 72 166 90" stroke="#FF7A00" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.3" />

      {/* Checkmark badge */}
      <circle cx="145" cy="42" r="14" fill="#FF7A00" />
      <path d="M138 42 L143 47 L152 36" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
