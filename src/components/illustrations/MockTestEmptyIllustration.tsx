export function MockTestEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="mockGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF7A00" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FF7A00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sheetGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFAF5" />
          <stop offset="100%" stopColor="#FFF0E3" />
        </linearGradient>
      </defs>

      {/* Background glow */}
      <ellipse cx="140" cy="110" rx="100" ry="70" fill="url(#mockGlow)" />

      {/* Answer sheet — back (fanned slightly right) */}
      <rect
        x="108" y="68" width="80" height="104" rx="6"
        fill="url(#sheetGrad)" stroke="#FFD4A8" strokeWidth="1.5"
        transform="rotate(8 148 120)"
      />
      {/* Lines on back sheet */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1="118" y1={88 + i * 13} x2="178" y2={88 + i * 13}
          stroke="#FFD4A8" strokeWidth="1.2" opacity="0.7"
          transform="rotate(8 148 120)"
        />
      ))}

      {/* Answer sheet — front */}
      <rect x="90" y="62" width="80" height="104" rx="6" fill="url(#sheetGrad)" stroke="#FFB366" strokeWidth="1.5" />
      {/* Sheet header bar */}
      <rect x="90" y="62" width="80" height="16" rx="6" fill="#FFE5CC" />
      <rect x="90" y="72" width="80" height="6" fill="#FFE5CC" />
      {/* Answer lines */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          x1="100" y1={90 + i * 12} x2="160" y2={90 + i * 12}
          stroke="#FFD4A8" strokeWidth="1.2"
        />
      ))}
      {/* Checkmark on first answer */}
      <path d="M102 90 L106 94 L114 84" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Stopwatch body */}
      <circle cx="176" cy="96" r="34" fill="#FFF3E8" stroke="#FF7A00" strokeWidth="2" />
      <circle cx="176" cy="96" r="27" fill="white" stroke="#FFD4A8" strokeWidth="1" />

      {/* Stopwatch crown */}
      <rect x="172" y="58" width="8" height="7" rx="3" fill="#FF7A00" />
      {/* Stopwatch button */}
      <rect x="186" y="56" width="6" height="5" rx="2.5" fill="#FFB366" transform="rotate(30 189 58)" />

      {/* Clock hands */}
      <line x1="176" y1="96" x2="176" y2="75" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" />
      <line x1="176" y1="96" x2="190" y2="100" stroke="#CC6200" strokeWidth="1.5" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx="176" cy="96" r="3" fill="#FF7A00" />

      {/* Tick marks */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 12 - Math.PI / 2;
        const r1 = 22, r2 = i % 3 === 0 ? 18 : 20;
        return (
          <line
            key={i}
            x1={176 + Math.cos(angle) * r1}
            y1={96 + Math.sin(angle) * r1}
            x2={176 + Math.cos(angle) * r2}
            y2={96 + Math.sin(angle) * r2}
            stroke="#FFD4A8" strokeWidth={i % 3 === 0 ? 1.5 : 1}
          />
        );
      })}

      {/* Floating sparkles */}
      <path d="M68 72 L70 78 L76 80 L70 82 L68 88 L66 82 L60 80 L66 78Z" fill="#FF7A00" opacity="0.35" />
      <circle cx="210" cy="148" r="3" fill="#FFB366" opacity="0.5" />
      <circle cx="80" cy="140" r="2" fill="#FF7A00" opacity="0.3" />
      <circle cx="218" cy="72" r="2" fill="#FFD4A8" opacity="0.5" />
    </svg>
  );
}
