type TimerIllustrationProps = {
  className?: string;
  /** Hide the decorative “FOCUS” pill — useful beside a page title where the eyebrow already says Focus. */
  showFocusLabel?: boolean;
};

export function TimerIllustration({
  className,
  showFocusLabel = true,
}: TimerIllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="timerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF7A00" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FF7A00" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow behind hourglass */}
      <circle cx="120" cy="105" r="70" fill="url(#timerGlow)" />

      {/* Hourglass outline */}
      <path
        d="M76 40 L164 40 L164 46 L136 90 L164 134 L164 140 L76 140 L76 134 L104 90 L76 46Z"
        fill="#FFF0E3"
        stroke="#FF7A00"
        strokeWidth="2.5"
      />

      {/* Top sand */}
      <path d="M80 46 L160 46 L134 86 Q120 92 106 86Z" fill="#FFB366" opacity="0.6" />

      {/* Sand falling (thin stream) */}
      <rect x="118" y="86" width="4" height="16" rx="2" fill="#FF7A00" opacity="0.5" />

      {/* Bottom sand pile */}
      <path d="M106 134 Q120 118 134 134Z" fill="#FF7A00" opacity="0.7" />
      <path d="M100 134 L140 134 Q138 138 120 138 Q102 138 100 134Z" fill="#FF7A00" opacity="0.5" />

      {/* Hourglass top cap */}
      <rect x="70" y="33" width="100" height="10" rx="5" fill="#FF7A00" opacity="0.8" />
      {/* Hourglass bottom cap */}
      <rect x="70" y="137" width="100" height="10" rx="5" fill="#FF7A00" opacity="0.8" />

      {/* Clock/tick marks on side */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 120 + Math.cos(rad) * 80;
        const y1 = 90 + Math.sin(rad) * 80;
        const x2 = 120 + Math.cos(rad) * 88;
        const y2 = 90 + Math.sin(rad) * 88;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        );
      })}

      {/* Stars of focus */}
      <path d="M46 56 L48 64 L56 66 L48 68 L46 76 L44 68 L36 66 L44 64Z" fill="#FF7A00" opacity="0.5" />
      <path d="M192 44 L193.5 50 L200 51.5 L193.5 53 L192 59 L190.5 53 L184 51.5 L190.5 50Z"
        fill="#FFB366" opacity="0.6" />
      <circle cx="184" cy="130" r="4" fill="#FF7A00" opacity="0.3" />
      <circle cx="56" cy="118" r="3" fill="#FFB366" opacity="0.3" />

      {showFocusLabel ? (
        <>
          {/* "Focus" label */}
          <rect
            x="88"
            y="162"
            width="64"
            height="22"
            rx="11"
            fill="#FF7A00"
            opacity="0.12"
          />
          <text
            x="120"
            y="177"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="#FF7A00"
            letterSpacing="2"
          >
            FOCUS
          </text>
        </>
      ) : null}

      {/* Small sand grains falling */}
      <circle cx="120" cy="98" r="1.5" fill="#FF7A00" opacity="0.6" />
      <circle cx="118" cy="94" r="1" fill="#FF7A00" opacity="0.4" />
      <circle cx="122" cy="96" r="1" fill="#FF7A00" opacity="0.4" />
    </svg>
  );
}
