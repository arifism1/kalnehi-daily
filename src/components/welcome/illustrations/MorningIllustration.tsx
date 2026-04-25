/**
 * Dawn sun rising from the horizon — motion via CSS (see `.kal-welcome-sun-rise`).
 * Brand orange #F07B1D, cream sky.
 */
export function MorningIllustration({ className }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[390px] overflow-hidden ${className ?? ""}`}
      aria-hidden
    >
      <div className="kal-welcome-sun-rise -mb-[1px] w-full will-change-transform">
        <svg
          viewBox="0 0 390 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[min(200px,42vh)] w-full"
        >
          <defs>
            <linearGradient id="kalDawnSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FAF6F1" />
              <stop offset="45%" stopColor="#FFF0E3" />
              <stop offset="100%" stopColor="#FFE1C4" stopOpacity="0.95" />
            </linearGradient>
            <radialGradient id="kalSunHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F07B1D" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#F07B1D" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="390" height="200" fill="url(#kalDawnSky)" />

          <g>
            <ellipse
              cx="195"
              cy="168"
              rx="120"
              ry="8"
              fill="#F07B1D"
              opacity="0.12"
            />
            <circle
              cx="195"
              cy="168"
              r="90"
              fill="url(#kalSunHalo)"
            />
            <circle
              cx="195"
              cy="168"
              r="40"
              fill="#F07B1D"
              fillOpacity="0.95"
            />
            <circle
              cx="195"
              cy="168"
              r="32"
              fill="#FFB04A"
              fillOpacity="0.85"
            />
            {Array.from({ length: 10 }).map((_, i) => {
              const a = (i * Math.PI * 2) / 10;
              const r1 = 48;
              const r2 = 60;
              const yScale = 0.45;
              const x1 = 195 + Math.cos(a) * r1;
              const y1 = 168 + Math.sin(a) * r1 * yScale;
              const x2 = 195 + Math.cos(a) * r2;
              const y2 = 168 + Math.sin(a) * r2 * yScale;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#F07B1D"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.4"
                />
              );
            })}
          </g>

          <path
            d="M0 175 Q97 150 195 160 Q293 170 390 150 L390 200 L0 200Z"
            fill="#E8C9A8"
            fillOpacity="0.35"
          />
          <path
            d="M0 188 Q130 170 195 178 Q260 186 390 170 L390 200 L0 200Z"
            fill="#C9A882"
            fillOpacity="0.25"
          />
          <ellipse
            cx="72"
            cy="52"
            rx="28"
            ry="9"
            fill="white"
            fillOpacity="0.55"
          />
          <ellipse
            cx="310"
            cy="48"
            rx="32"
            ry="10"
            fill="white"
            fillOpacity="0.45"
          />
        </svg>
      </div>
    </div>
  );
}
