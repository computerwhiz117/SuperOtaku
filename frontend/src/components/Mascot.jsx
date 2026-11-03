export default function Mascot({ size = 170 }) {
  return (
    <svg
      className="mascot"
      width={size}
      height={size * (260 / 220)}
      viewBox="0 0 220 260"
      role="img"
      aria-label="Neo-chan, the SuperOtaku android mascot"
    >
      <defs>
        <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="capeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <radialGradient id="coreGlow">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="60%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0891b2" />
        </radialGradient>
      </defs>

      {/* cape */}
      <path
        d="M72 132 Q38 190 54 236 Q88 216 110 232 Q132 216 166 236 Q182 190 148 132 Z"
        fill="url(#capeGrad)"
        opacity="0.9"
      />

      {/* legs + boots */}
      <rect x="93" y="188" width="13" height="36" rx="6" fill="#2d2d45" />
      <rect x="114" y="188" width="13" height="36" rx="6" fill="#2d2d45" />
      <ellipse cx="99" cy="228" rx="12" ry="7" fill="#7c3aed" />
      <ellipse cx="121" cy="228" rx="12" ry="7" fill="#7c3aed" />

      {/* raised heroic arm with fist (viewer left) */}
      <path
        d="M88 150 Q66 120 56 80"
        stroke="#232345"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="54" cy="72" r="11" fill="#ffe3d2" />

      {/* arm down (viewer right) */}
      <path
        d="M132 150 Q146 168 142 188"
        stroke="#232345"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="142" cy="192" r="9" fill="#ffe3d2" />

      {/* torso suit */}
      <path d="M86 140 L134 140 L141 194 Q110 206 79 194 Z" fill="#232345" />
      <path d="M86 140 L134 140 L136 152 L84 152 Z" fill="#3f3f63" />
      {/* glowing power core */}
      <circle cx="110" cy="170" r="13" fill="url(#coreGlow)" opacity="0.35" />
      <circle cx="110" cy="170" r="8" fill="url(#coreGlow)" />

      {/* back hair */}
      <circle cx="110" cy="92" r="56" fill="url(#hairGrad)" />
      <path d="M58 100 Q46 140 58 168 Q72 150 70 118 Z" fill="url(#hairGrad)" />
      <path d="M162 100 Q174 140 162 168 Q148 150 150 118 Z" fill="url(#hairGrad)" />

      {/* face */}
      <ellipse cx="110" cy="102" rx="47" ry="43" fill="#ffe3d2" />

      {/* bangs */}
      <path
        d="M63 102 Q60 52 110 46 Q160 52 157 102 Q150 78 136 88 Q130 70 110 78 Q96 66 90 86 Q74 76 63 102 Z"
        fill="url(#hairGrad)"
      />

      {/* android ear pods */}
      <circle cx="59" cy="104" r="11" fill="#7c3aed" />
      <circle cx="59" cy="104" r="5" fill="#67e8f9" />
      <circle cx="161" cy="104" r="11" fill="#7c3aed" />
      <circle cx="161" cy="104" r="5" fill="#67e8f9" />

      {/* antenna */}
      <line x1="110" y1="42" x2="110" y2="20" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" />
      <circle className="antenna-tip" cx="110" cy="15" r="6" fill="#fbbf24" />

      {/* eyes */}
      <ellipse cx="90" cy="110" rx="10" ry="13" fill="#2d1b4e" />
      <ellipse cx="130" cy="110" rx="10" ry="13" fill="#2d1b4e" />
      <ellipse cx="90" cy="108" rx="7" ry="9" fill="#7c3aed" />
      <ellipse cx="130" cy="108" rx="7" ry="9" fill="#7c3aed" />
      <circle cx="93" cy="104" r="3.2" fill="#ffffff" />
      <circle cx="133" cy="104" r="3.2" fill="#ffffff" />
      <circle cx="87" cy="114" r="1.6" fill="#ffffff" opacity="0.8" />
      <circle cx="127" cy="114" r="1.6" fill="#ffffff" opacity="0.8" />

      {/* cyber cheek lights */}
      <circle cx="72" cy="122" r="3.5" fill="#67e8f9" opacity="0.8" />
      <circle cx="148" cy="122" r="3.5" fill="#67e8f9" opacity="0.8" />

      {/* smile */}
      <path d="M102 128 Q110 136 118 128" stroke="#b2543f" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* sparkles */}
      <path d="M28 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#fbbf24" opacity="0.9" />
      <path d="M192 60 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z" fill="#67e8f9" opacity="0.9" />
      <path d="M186 180 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#a78bfa" opacity="0.9" />
    </svg>
  )
}
