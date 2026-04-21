export function HabitIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Chain links (habit chain) */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const x = 28 + i * 34;
        const filled = i < 5;
        return (
          <g key={i}>
            <ellipse
              cx={x} cy={88}
              rx="14" ry="18"
              fill={filled ? "#FF7A00" : "#FFF0E3"}
              stroke="#FF7A00"
              strokeWidth="2.5"
              opacity={filled ? (0.5 + i * 0.1) : 0.5}
            />
            {filled && (
              <path
                d={`M${x - 6} 88 L${x - 2} 93 L${x + 7} 82`}
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* Connecting link */}
            {i < 6 && (
              <rect
                x={x + 12} y={85}
                width={12} height={6}
                rx={3}
                fill={filled && i < 4 ? "#FF7A00" : "#E8D5B7"}
                opacity={filled && i < 4 ? 0.6 : 0.4}
              />
            )}
          </g>
        );
      })}

      {/* Plant growing from last chain link */}
      {/* Stem */}
      <rect x="244" y="52" width="4" height="38" rx="2" fill="#5A9E6F" />
      {/* Leaves */}
      <path d="M248 72 Q262 60 264 76 Q254 78 248 72Z" fill="#6AAE7F" />
      <path d="M244 64 Q230 52 228 68 Q238 70 244 64Z" fill="#5A9E6F" opacity="0.8" />
      {/* Top leaf/bloom */}
      <ellipse cx="246" cy="48" rx="14" ry="10" fill="#4A8E5F" />
      <ellipse cx="242" cy="44" rx="9" ry="7" fill="#5A9E6F" opacity="0.9" />
      <ellipse cx="250" cy="44" rx="9" ry="7" fill="#6AAE7F" opacity="0.8" />
      {/* Flower center */}
      <circle cx="246" cy="42" r="5" fill="#FF7A00" opacity="0.8" />
      <circle cx="246" cy="42" r="3" fill="#FFD700" />

      {/* Streak fire above day 5 */}
      <path d="M157 62 Q160 52 163 58 Q165 50 169 55 Q172 44 175 50 Q178 42 180 52 Q184 60 176 68 Q172 64 168 68 Q162 64 157 62Z"
        fill="#FF7A00" opacity="0.8" />
      <path d="M161 64 Q163 58 165 62 Q167 56 170 62 Q172 58 174 64 Q172 70 168 70 Q162 70 161 64Z"
        fill="#FFD700" opacity="0.9" />

      {/* Streak number */}
      <text x="168" y="70" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#CC6200">5</text>

      {/* Date labels */}
      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
        <text key={i} x={28 + i * 34} y={118} textAnchor="middle" fontSize="9"
          fill={i < 5 ? "#FF7A00" : "#8A7560"} fontWeight={i < 5 ? "700" : "400"}>
          {d}
        </text>
      ))}

      {/* Title text */}
      <text x="140" y="145" textAnchor="middle" fontSize="9" fontWeight="700" fill="#8A7560" letterSpacing="2">
        KEEP THE CHAIN ALIVE
      </text>

      {/* Sparkles */}
      <path d="M18 54 L19.5 60 L26 61.5 L19.5 63 L18 69 L16.5 63 L10 61.5 L16.5 60Z"
        fill="#FF7A00" opacity="0.4" />
      <circle cx="264" cy="100" r="3" fill="#FF7A00" opacity="0.3" />
      <circle cx="270" cy="88" r="2" fill="#FFB366" opacity="0.3" />
    </svg>
  );
}
