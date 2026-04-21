export function StudyDeskIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Desk surface */}
      <rect x="20" y="168" width="280" height="12" rx="4" fill="#E8D5B7" />
      <rect x="24" y="178" width="4" height="40" rx="2" fill="#C9A97A" />
      <rect x="292" y="178" width="4" height="40" rx="2" fill="#C9A97A" />

      {/* Stack of books on left */}
      <rect x="32" y="148" width="48" height="10" rx="2" fill="#FF7A00" />
      <rect x="34" y="138" width="44" height="11" rx="2" fill="#FFB366" />
      <rect x="36" y="129" width="40" height="10" rx="2" fill="#FF7A00" opacity="0.7" />
      {/* Book spines detail */}
      <line x1="40" y1="129" x2="40" y2="158" stroke="#CC6200" strokeWidth="0.5" opacity="0.5" />

      {/* Laptop */}
      <rect x="100" y="128" width="120" height="80" rx="6" fill="#2D2D2D" />
      <rect x="104" y="132" width="112" height="72" rx="4" fill="#1A1A2E" />
      {/* Screen glow */}
      <rect x="108" y="136" width="104" height="64" rx="3" fill="#0F3460" opacity="0.8" />
      {/* Code lines on screen */}
      <rect x="114" y="144" width="60" height="3" rx="1.5" fill="#FF7A00" opacity="0.9" />
      <rect x="114" y="151" width="80" height="3" rx="1.5" fill="#64FFDA" opacity="0.7" />
      <rect x="118" y="158" width="50" height="3" rx="1.5" fill="#A8E6CF" opacity="0.6" />
      <rect x="114" y="165" width="70" height="3" rx="1.5" fill="#FF7A00" opacity="0.5" />
      <rect x="118" y="172" width="40" height="3" rx="1.5" fill="#64FFDA" opacity="0.4" />
      {/* Laptop base */}
      <rect x="90" y="208" width="140" height="6" rx="3" fill="#3D3D3D" />
      <rect x="115" y="204" width="90" height="5" rx="2" fill="#2D2D2D" />

      {/* Desk lamp */}
      <rect x="246" y="100" width="4" height="70" rx="2" fill="#8A7560" />
      <rect x="226" y="88" width="44" height="16" rx="8" fill="#8A7560" transform="rotate(-20 226 88)" />
      <ellipse cx="250" cy="105" rx="20" ry="8" fill="#FFE5B4" opacity="0.6" />

      {/* Pencil / pen */}
      <rect x="88" y="160" width="4" height="50" rx="2" fill="#FFD700" transform="rotate(15 88 160)" />
      <polygon points="84,208 92,208 88,218" fill="#FFB366" transform="rotate(15 88 208)" />

      {/* Small plant */}
      <rect x="270" y="150" width="8" height="20" rx="3" fill="#8B6914" />
      <ellipse cx="274" cy="148" rx="10" ry="8" fill="#5A9E6F" />
      <ellipse cx="268" cy="152" rx="7" ry="5" fill="#4A8E5F" />
      <ellipse cx="280" cy="153" rx="7" ry="5" fill="#6AAE7F" />

      {/* Orange glow under lamp */}
      <ellipse cx="248" cy="135" rx="30" ry="10" fill="#FF7A00" opacity="0.06" />

      {/* Floating subject badges */}
      {/* Physics atom */}
      <circle cx="60" cy="80" r="18" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="1.5" />
      <text x="60" y="85" textAnchor="middle" fontSize="14" fill="#FF7A00">⚛</text>

      {/* Math sigma */}
      <circle cx="260" cy="72" r="18" fill="#FFF0E3" stroke="#FF7A00" strokeWidth="1.5" />
      <text x="260" y="77" textAnchor="middle" fontSize="14" fill="#FF7A00">∑</text>

      {/* Biology leaf */}
      <circle cx="290" cy="120" r="14" fill="#E8F5E9" stroke="#5A9E6F" strokeWidth="1.5" />
      <text x="290" y="125" textAnchor="middle" fontSize="11" fill="#5A9E6F">🌿</text>

      {/* Star sparkle top right */}
      <path
        d="M288 40 L290 48 L298 50 L290 52 L288 60 L286 52 L278 50 L286 48Z"
        fill="#FF7A00"
        opacity="0.8"
      />
      <path
        d="M44 50 L45.5 55 L50 56.5 L45.5 58 L44 63 L42.5 58 L38 56.5 L42.5 55Z"
        fill="#FF7A00"
        opacity="0.5"
      />
    </svg>
  );
}
