export function SavedPlansEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="savedGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF7A00" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FF7A00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pageGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFAF5" />
          <stop offset="100%" stopColor="#FFF0E3" />
        </linearGradient>
        <linearGradient id="page2Grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8F0" />
          <stop offset="100%" stopColor="#FFE8CC" />
        </linearGradient>
      </defs>

      {/* Background glow */}
      <ellipse cx="140" cy="110" rx="100" ry="65" fill="url(#savedGlow)" />

      {/* Back page (slightly rotated) */}
      <rect x="108" y="58" width="72" height="96" rx="6" fill="url(#page2Grad)" stroke="#FFD4A8" strokeWidth="1.5" transform="rotate(-6 144 106)" />
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1="118" y1={80 + i * 13} x2="170" y2={80 + i * 13}
          stroke="#FFD4A8" strokeWidth="1" opacity="0.6"
          transform="rotate(-6 144 106)"
        />
      ))}

      {/* Middle page */}
      <rect x="104" y="56" width="72" height="96" rx="6" fill="url(#pageGrad)" stroke="#FFB366" strokeWidth="1.5" transform="rotate(3 140 104)" />
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1="114" y1={78 + i * 13} x2="166" y2={78 + i * 13}
          stroke="#FFD4A8" strokeWidth="1" opacity="0.6"
          transform="rotate(3 140 104)"
        />
      ))}

      {/* Front page */}
      <rect x="100" y="54" width="72" height="96" rx="6" fill="url(#pageGrad)" stroke="#FF7A00" strokeWidth="1.5" />
      {/* Header line */}
      <rect x="100" y="54" width="72" height="14" rx="6" fill="#FFE5CC" />
      <rect x="100" y="62" width="72" height="6" fill="#FFE5CC" />
      {/* Content lines */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="110" y1={80 + i * 13} x2="162" y2={80 + i * 13}
          stroke="#FFD4A8" strokeWidth="1.2"
        />
      ))}
      {/* Short line (incomplete) */}
      <line x1="110" y1="132" x2="140" y2="132" stroke="#FFD4A8" strokeWidth="1.2" />

      {/* Page curl bottom-right */}
      <path d="M172 150 L154 150 Q172 150 172 132" fill="#FFE5CC" stroke="#FFB366" strokeWidth="1" />
      <path d="M172 150 L154 150 Q163 150 163 139" fill="#FFF3E8" />

      {/* Bookmark ribbon — orange, tall */}
      <path d="M178 42 L178 110 L168 102 L158 110 L158 42 Z" fill="#FF7A00" opacity="0.9" />
      {/* Bookmark highlight */}
      <path d="M178 42 L175 42 L175 110 L178 110 Z" fill="white" opacity="0.15" />
      {/* Star on bookmark */}
      <path d="M168 62 L170 68 L176 68 L171 72 L173 78 L168 74 L163 78 L165 72 L160 68 L166 68Z"
        fill="white" opacity="0.85" />

      {/* Floating dots */}
      <circle cx="90" cy="72" r="3" fill="#FFB366" opacity="0.45" />
      <circle cx="212" cy="68" r="2.5" fill="#FF7A00" opacity="0.35" />
      <circle cx="220" cy="140" r="2" fill="#FFD4A8" opacity="0.5" />
      <path d="M72 120 L73.5 125 L79 126.5 L73.5 128 L72 133 L70.5 128 L65 126.5 L70.5 125Z" fill="#FF7A00" opacity="0.3" />
    </svg>
  );
}
