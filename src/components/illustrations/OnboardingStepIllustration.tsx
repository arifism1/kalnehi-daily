type OnboardingStep = 1 | 2 | 3 | 4;

interface OnboardingStepIllustrationProps {
  step: OnboardingStep;
  className?: string;
}

function Step1Illustration() {
  return (
    <>
      {/* Person silhouette */}
      <circle cx="160" cy="58" r="28" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="2" />
      <circle cx="160" cy="50" r="14" fill="#FFB366" />
      <path d="M128 110 Q128 82 160 82 Q192 82 192 110" fill="#FF7A00" opacity="0.85" />
      {/* Name tag */}
      <rect x="100" y="118" width="120" height="44" rx="10" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="1.5" />
      <rect x="114" y="128" width="60" height="6" rx="3" fill="#FF7A00" opacity="0.4" />
      <rect x="114" y="140" width="40" height="6" rx="3" fill="#FF7A00" opacity="0.25" />
      {/* Stars */}
      <path d="M74 54 L76 62 L84 64 L76 66 L74 74 L72 66 L64 64 L72 62Z" fill="#FF7A00" opacity="0.5" />
      <path d="M240 60 L241.5 66 L248 67.5 L241.5 69 L240 75 L238.5 69 L232 67.5 L238.5 66Z" fill="#FF7A00" opacity="0.4" />
    </>
  );
}

function Step2Illustration() {
  return (
    <>
      {/* Target/Bullseye */}
      <circle cx="160" cy="90" r="56" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="1.5" opacity="0.5" />
      <circle cx="160" cy="90" r="40" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="1.5" opacity="0.7" />
      <circle cx="160" cy="90" r="24" fill="#FFE5CC" stroke="#FF7A00" strokeWidth="1.5" />
      <circle cx="160" cy="90" r="10" fill="#FF7A00" />
      {/* Arrow */}
      <line x1="220" y1="30" x2="170" y2="86" stroke="#CC6200" strokeWidth="3" strokeLinecap="round" />
      <polygon points="168,82 178,78 174,88" fill="#CC6200" />
      {/* Trophy */}
      <path d="M240 118 Q240 132 252 136 L248 148 L256 148 L252 136 Q264 132 264 118Z" fill="#FFD700" />
      <rect x="246" y="148" width="12" height="4" rx="2" fill="#CC9900" />
      <rect x="243" y="152" width="18" height="3" rx="1.5" fill="#CC9900" />
    </>
  );
}

function Step3Illustration() {
  return (
    <>
      {/* Calendar */}
      <rect x="80" y="60" width="160" height="120" rx="12" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="2" />
      {/* Header */}
      <rect x="80" y="60" width="160" height="32" rx="12" fill="#FF7A00" />
      <rect x="80" y="80" width="160" height="12" fill="#FF7A00" />
      <text x="160" y="82" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">April 2026</text>
      {/* Grid lines */}
      <line x1="80" y1="108" x2="240" y2="108" stroke="#FFD4A8" strokeWidth="1" />
      <line x1="80" y1="128" x2="240" y2="128" stroke="#FFD4A8" strokeWidth="1" />
      <line x1="80" y1="148" x2="240" y2="148" stroke="#FFD4A8" strokeWidth="1" />
      {/* Days */}
      {[95, 118, 141, 164, 187, 210].map((x, i) => (
        <text key={i} x={x} y="102" textAnchor="middle" fontSize="8" fill="#CC6200" fontWeight="600">
          {["M", "T", "W", "T", "F", "S"][i]}
        </text>
      ))}
      {/* Date numbers */}
      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map((d, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const x = 95 + col * 23;
        const y = 122 + row * 20;
        const isHighlight = d === 12;
        return (
          <g key={d}>
            {isHighlight && <circle cx={x} cy={y - 4} r="9" fill="#FF7A00" />}
            <text x={x} y={y} textAnchor="middle" fontSize="9" fill={isHighlight ? "white" : "#8A7560"}>
              {d}
            </text>
          </g>
        );
      })}
      {/* Countdown badge */}
      <rect x="192" y="148" width="48" height="24" rx="8" fill="#FF7A00" />
      <text x="216" y="162" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white">D-day!</text>
      {/* Sparkles */}
      <path d="M58 80 L60 88 L68 90 L60 92 L58 100 L56 92 L48 90 L56 88Z" fill="#FF7A00" opacity="0.5" />
      <path d="M258 68 L259.5 74 L266 75.5 L259.5 77 L258 83 L256.5 77 L250 75.5 L256.5 74Z" fill="#FFB366" opacity="0.7" />
    </>
  );
}

function Step4Illustration() {
  return (
    <>
      {/* Dashboard grid */}
      <rect x="56" y="52" width="208" height="136" rx="12" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="1.5" />
      {/* Header bar */}
      <rect x="56" y="52" width="208" height="24" rx="12" fill="#FF7A00" />
      <rect x="56" y="64" width="208" height="12" fill="#FF7A00" />
      <circle cx="76" cy="64" r="5" fill="white" opacity="0.5" />
      <circle cx="94" cy="64" r="5" fill="white" opacity="0.3" />
      {/* Feature tiles */}
      {[
        { x: 68, y: 90, label: "Plan", color: "#FF7A00" },
        { x: 128, y: 90, label: "Track", color: "#5A9E6F" },
        { x: 188, y: 90, label: "Learn", color: "#4A90D9" },
        { x: 68, y: 148, label: "Timer", color: "#9B59B6" },
        { x: 128, y: 148, label: "Habits", color: "#E67E22" },
        { x: 188, y: 148, label: "AI", color: "#FF7A00" },
      ].map(({ x, y, label, color }) => (
        <g key={label}>
          <rect x={x - 24} y={y - 20} width="48" height="40" rx="8" fill="white" />
          <rect x={x - 24} y={y - 20} width="48" height="40" rx="8" fill={color} opacity="0.1" />
          <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={color}>
            {label}
          </text>
        </g>
      ))}
      {/* Checkmark overlay */}
      <circle cx="216" cy="54" r="14" fill="white" />
      <path d="M209 54 L214 59 L223 49" stroke="#FF7A00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Sparkles */}
      <path d="M40 90 L42 98 L50 100 L42 102 L40 110 L38 102 L30 100 L38 98Z" fill="#FF7A00" opacity="0.4" />
      <path d="M272 130 L273.5 136 L280 137.5 L273.5 139 L272 145 L270.5 139 L264 137.5 L270.5 136Z" fill="#FFB366" opacity="0.6" />
    </>
  );
}

export function OnboardingStepIllustration({ step, className }: OnboardingStepIllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {step === 1 && <Step1Illustration />}
      {step === 2 && <Step2Illustration />}
      {step === 3 && <Step3Illustration />}
      {step === 4 && <Step4Illustration />}
    </svg>
  );
}
