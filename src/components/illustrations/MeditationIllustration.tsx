export function MeditationIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="meditGlow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#FF7A00" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FF7A00" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background glow */}
      <ellipse cx="140" cy="110" rx="120" ry="60" fill="url(#meditGlow)" />

      {/* Ground lotus ring */}
      <ellipse cx="140" cy="138" rx="60" ry="12" fill="#FFE5CC" opacity="0.4" />

      {/* Meditating figure */}
      {/* Crossed legs */}
      <path d="M90 140 Q110 120 140 118 Q170 120 190 140" fill="#FFB366" opacity="0.5" />
      <ellipse cx="140" cy="128" rx="42" ry="16" fill="#FF7A00" opacity="0.2" />
      {/* Body */}
      <path d="M122 120 Q122 90 140 85 Q158 90 158 120Z" fill="#FFB366" opacity="0.7" />
      {/* Head */}
      <circle cx="140" cy="74" r="18" fill="#FFB366" opacity="0.8" />
      {/* Arms (mudra position) */}
      <path d="M122 112 Q108 120 104 130" stroke="#FFB366" strokeWidth="8" strokeLinecap="round" opacity="0.6" />
      <path d="M158 112 Q172 120 176 130" stroke="#FFB366" strokeWidth="8" strokeLinecap="round" opacity="0.6" />
      {/* Hands resting */}
      <circle cx="104" cy="132" r="6" fill="#FFB366" opacity="0.6" />
      <circle cx="176" cy="132" r="6" fill="#FFB366" opacity="0.6" />
      {/* Closed eyes */}
      <path d="M134 73 Q137 71 140 73" stroke="#CC6200" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M140 73 Q143 71 146 73" stroke="#CC6200" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />

      {/* Breathing circles — SMIL animated, staggered outward */}
      <circle cx="140" cy="90" r="30" stroke="#FF7A00" strokeWidth="1" fill="none" opacity="0.15">
        <animate attributeName="r" values="28;33;28" dur="4s" begin="0s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0.28;0.15" dur="4s" begin="0s" repeatCount="indefinite" />
      </circle>
      <circle cx="140" cy="90" r="50" stroke="#FF7A00" strokeWidth="1" fill="none" opacity="0.1">
        <animate attributeName="r" values="47;54;47" dur="4s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.1;0.2;0.1" dur="4s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="140" cy="90" r="70" stroke="#FF7A00" strokeWidth="1" fill="none" opacity="0.07">
        <animate attributeName="r" values="66;74;66" dur="4s" begin="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.07;0.14;0.07" dur="4s" begin="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="140" cy="90" r="92" stroke="#FF7A00" strokeWidth="1" fill="none" opacity="0.04">
        <animate attributeName="r" values="87;96;87" dur="4s" begin="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.04;0.09;0.04" dur="4s" begin="1.5s" repeatCount="indefinite" />
      </circle>

      {/* Floating particles */}
      <circle cx="74" cy="62" r="3" fill="#FF7A00" opacity="0.3">
        <animate attributeName="cy" values="62;57;62" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="62" cy="82" r="2" fill="#FFB366" opacity="0.4">
        <animate attributeName="cy" values="82;77;82" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="206" cy="58" r="3" fill="#FF7A00" opacity="0.3">
        <animate attributeName="cy" values="58;53;58" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="218" cy="80" r="2" fill="#FFB366" opacity="0.4">
        <animate attributeName="cy" values="80;75;80" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="94" cy="44" r="2" fill="#FFD4A8" opacity="0.5" />
      <circle cx="186" cy="44" r="2" fill="#FFD4A8" opacity="0.5" />

      {/* Leaf / lotus petals below */}
      <path d="M110 140 Q115 132 125 135 Q120 142 110 140Z" fill="#5A9E6F" opacity="0.4" />
      <path d="M170 140 Q165 132 155 135 Q160 142 170 140Z" fill="#5A9E6F" opacity="0.4" />
      <path d="M130 145 Q135 136 140 138 Q145 136 150 145 Q140 148 130 145Z" fill="#5A9E6F" opacity="0.5" />

      {/* Crown aura dot — slow breathing pulse */}
      <circle cx="140" cy="52" r="4" fill="#FF7A00" opacity="0.5">
        <animate attributeName="r" values="4;5.5;4" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.85;0.5" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="140" cy="52" r="7" stroke="#FF7A00" strokeWidth="1" fill="none" opacity="0.2">
        <animate attributeName="r" values="7;9.5;7" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* Moon/calm symbol top right */}
      <path d="M240 28 Q248 34 242 44 Q252 40 252 32 Q252 22 240 28Z" fill="#FF7A00" opacity="0.3" />
      {/* Stars */}
      <circle cx="258" cy="24" r="2" fill="#FF7A00" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="228" cy="18" r="1.5" fill="#FFB366" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.75;0.4" dur="3.1s" repeatCount="indefinite" />
      </circle>
      <circle cx="52" cy="30" r="2" fill="#FF7A00" opacity="0.3" />
    </svg>
  );
}
