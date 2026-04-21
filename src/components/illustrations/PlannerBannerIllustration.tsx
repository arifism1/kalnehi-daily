export function PlannerBannerIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Open notebook */}
      <rect x="80" y="20" width="320" height="110" rx="8" fill="#FFFBF5" stroke="#E8D5B7" strokeWidth="1.5" />
      {/* Spine */}
      <rect x="236" y="20" width="8" height="110" fill="#E8D5B7" />

      {/* Left page - Week grid */}
      <text x="100" y="42" fontSize="8" fontWeight="700" fill="#FF7A00" letterSpacing="2">WEEK PLAN</text>

      {/* Day columns left page */}
      {["M", "T", "W", "T"].map((d, i) => (
        <g key={i}>
          <text x={102 + i * 30} y="56" fontSize="8" fill="#8A7560" fontWeight="600">{d}</text>
          <rect x={97 + i * 30} y="60" width="22" height="32" rx="4" fill="#FFF0E3" />
          {i < 2 && <rect x={99 + i * 30} y="64" width="14" height="3" rx="1.5" fill="#FF7A00" opacity="0.5" />}
          {i < 2 && <rect x={99 + i * 30} y="70" width="10" height="3" rx="1.5" fill="#FF7A00" opacity="0.3" />}
          {i === 0 && <rect x={99} y="76" width="12" height="3" rx="1.5" fill="#FF7A00" opacity="0.4" />}
        </g>
      ))}

      {/* Habit tracker left bottom */}
      <text x="100" y="108" fontSize="7" fill="#8A7560" fontWeight="600">HABITS</text>
      {[0,1,2,3,4,5,6].map((i) => (
        <rect key={i} x={100 + i * 16} y="112" width="12" height="12" rx="3"
          fill={i < 4 ? "#FF7A00" : "#FFF0E3"}
          opacity={i < 4 ? (0.4 + i * 0.15) : 1}
        />
      ))}

      {/* Right page - Todos & schedule */}
      <text x="256" y="42" fontSize="8" fontWeight="700" fill="#FF7A00" letterSpacing="2">TODOS</text>

      {/* Todo items */}
      {[
        { done: true, text: "Physics Ch.5" },
        { done: true, text: "Mock test review" },
        { done: false, text: "Chemistry notes" },
        { done: false, text: "Maths practice" },
      ].map(({ done, text }, i) => (
        <g key={i}>
          <circle cx={264} cy={55 + i * 16} r="5"
            fill={done ? "#FF7A00" : "none"}
            stroke={done ? "#FF7A00" : "#C9A97A"}
            strokeWidth="1.5"
          />
          {done && (
            <path d={`M261 ${55 + i * 16} L263 ${57 + i * 16} L268 ${52 + i * 16}`}
              stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
          )}
          <text x={274} y={59 + i * 16} fontSize="8"
            fill={done ? "#8A7560" : "#4A3728"}
            style={{ textDecoration: done ? "line-through" : "none" }}
          >
            {text}
          </text>
        </g>
      ))}

      {/* Time blocks */}
      <text x="256" y="122" fontSize="7" fill="#8A7560" fontWeight="600">TODAY'S BLOCKS</text>
      <rect x="256" y="126" width="55" height="10" rx="3" fill="#FF7A00" opacity="0.7" />
      <text x="258" y="133" fontSize="7" fill="white">9–11 Physics</text>
      <rect x="318" y="126" width="50" height="10" rx="3" fill="#FFB366" opacity="0.8" />
      <text x="320" y="133" fontSize="7" fill="white">2–4 Chem</text>

      {/* Pencil/pen resting */}
      <rect x="406" y="18" width="5" height="72" rx="2.5" fill="#FFD700" transform="rotate(12 406 18)" />
      <polygon points="404,88 412,88 408,100" fill="#CC9900" transform="rotate(12 408 94)" />
      <rect x="404" y="18" width="5" height="6" rx="1" fill="#FF6B6B" transform="rotate(12 406 18)" />

      {/* Paper clips */}
      <path d="M64 30 Q58 30 58 40 Q58 55 70 55 Q82 55 82 40 Q82 30 76 30 Q70 30 70 40 Q70 50 76 50"
        stroke="#C9A97A" strokeWidth="2" fill="none" strokeLinecap="round"
      />

      {/* Sparkle */}
      <path d="M420 28 L422 36 L430 38 L422 40 L420 48 L418 40 L410 38 L418 36Z" fill="#FF7A00" opacity="0.5" />
      <path d="M52 100 L53.5 106 L60 107.5 L53.5 109 L52 115 L50.5 109 L44 107.5 L50.5 106Z" fill="#FFB366" opacity="0.4" />

      {/* Orange accent bar at top of notebook */}
      <rect x="80" y="20" width="320" height="5" rx="4" fill="#FF7A00" opacity="0.6" />
    </svg>
  );
}
