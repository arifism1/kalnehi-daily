export function ConsistencyIllustration({ className }: { className?: string }) {
  const cells = [
    // row 1: week 1
    { x: 0, y: 0, fill: "#E8D5B7" },
    { x: 1, y: 0, fill: "#FFB366" },
    { x: 2, y: 0, fill: "#FF7A00" },
    { x: 3, y: 0, fill: "#FF7A00" },
    { x: 4, y: 0, fill: "#FFB366" },
    { x: 5, y: 0, fill: "#FF7A00" },
    { x: 6, y: 0, fill: "#E8D5B7" },
    // row 2
    { x: 0, y: 1, fill: "#FFB366" },
    { x: 1, y: 1, fill: "#FF7A00" },
    { x: 2, y: 1, fill: "#FF7A00" },
    { x: 3, y: 1, fill: "#FF7A00" },
    { x: 4, y: 1, fill: "#FF7A00" },
    { x: 5, y: 1, fill: "#FFB366" },
    { x: 6, y: 1, fill: "#FF7A00" },
    // row 3
    { x: 0, y: 2, fill: "#E8D5B7" },
    { x: 1, y: 2, fill: "#FFB366" },
    { x: 2, y: 2, fill: "#FF7A00" },
    { x: 3, y: 2, fill: "#FFD4A8" },
    { x: 4, y: 2, fill: "#FF7A00" },
    { x: 5, y: 2, fill: "#FF7A00" },
    { x: 6, y: 2, fill: "#FFB366" },
    // row 4
    { x: 0, y: 3, fill: "#FFB366" },
    { x: 1, y: 3, fill: "#FF7A00" },
    { x: 2, y: 3, fill: "#FF7A00" },
    { x: 3, y: 3, fill: "#FF7A00" },
    { x: 4, y: 3, fill: "#FF7A00" },
    { x: 5, y: 3, fill: "#FF7A00" },
    { x: 6, y: 3, fill: "#FFD4A8" },
    // row 5
    { x: 0, y: 4, fill: "#E8D5B7" },
    { x: 1, y: 4, fill: "#FF7A00" },
    { x: 2, y: 4, fill: "#FFB366" },
    { x: 3, y: 4, fill: "#FF7A00" },
    { x: 4, y: 4, fill: "#FF7A00" },
    { x: 5, y: 4, fill: "#FF7A00" },
    { x: 6, y: 4, fill: "#FF7A00" },
  ];

  const CELL = 22;
  const GAP = 4;
  const STEP = CELL + GAP;

  return (
    <svg
      viewBox="0 0 220 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Heatmap grid */}
      <g transform="translate(24, 28)">
        {cells.map(({ x, y, fill }) => (
          <rect
            key={`${x}-${y}`}
            x={x * STEP}
            y={y * STEP}
            width={CELL}
            height={CELL}
            rx="5"
            fill={fill}
            opacity={fill === "#E8D5B7" ? 0.5 : 1}
          />
        ))}
      </g>

      {/* Streak fire top-right of heatmap */}
      <path d="M182 18 Q186 8 190 15 Q193 6 197 12 Q200 2 203 10 Q207 18 200 26 Q196 22 192 26 Q186 22 182 18Z"
        fill="#FF7A00" opacity="0.85" />
      <path d="M185 20 Q188 14 190 18 Q192 12 195 18 Q198 22 192 26 Q188 24 185 20Z"
        fill="#FFD700" opacity="0.9" />

      {/* Streak number */}
      <text x="192" y="44" textAnchor="middle" fontSize="13" fontWeight="800" fill="#FF7A00">28</text>
      <text x="192" y="55" textAnchor="middle" fontSize="7" fill="#8A7560" fontWeight="600">day streak</text>

      {/* Day labels */}
      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
        <text key={i} x={24 + i * 26 + 11} y={20} textAnchor="middle" fontSize="8" fill="#8A7560" fontWeight="600">
          {d}
        </text>
      ))}

      {/* Progress bar below grid */}
      <rect x="24" y="148" width="168" height="8" rx="4" fill="#E8D5B7" />
      <rect x="24" y="148" width="138" height="8" rx="4" fill="#FF7A00" opacity="0.7" />

      {/* Label */}
      <text x="24" y="168" fontSize="8" fill="#8A7560">Month completion</text>
      <text x="192" y="168" textAnchor="end" fontSize="8" fill="#FF7A00" fontWeight="700">82%</text>

      {/* Sparkles */}
      <path d="M14 60 L15.5 66 L22 67.5 L15.5 69 L14 75 L12.5 69 L6 67.5 L12.5 66Z"
        fill="#FF7A00" opacity="0.35" />
      <circle cx="208" cy="100" r="3" fill="#FFB366" opacity="0.4" />
      <circle cx="14" cy="110" r="2" fill="#FFD4A8" opacity="0.4" />
    </svg>
  );
}
