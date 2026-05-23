// AXIOM — SVG Logo Component
// Replicates the triangular A symbol from the brand logo
// Purple gradient matching #6030D0 → #B060FF

export function AxiomLogo({ size = 32 }: { size?: number }) {
  const id = "axiom-grad"
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={id} x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C060FF" />
          <stop offset="50%" stopColor="#8B3FF0" />
          <stop offset="100%" stopColor="#5C20C0" />
        </linearGradient>
      </defs>
      {/* Outer triangle — left leg */}
      <path
        d="M50 8 L8 92 L28 92 L50 42 L72 92 L92 92 Z"
        fill={`url(#${id})`}
      />
      {/* Inner cutout — creates the A negative space */}
      <path
        d="M50 42 L36 72 L64 72 Z"
        fill="#F7F8FA"
      />
      {/* Crossbar cut — the horizontal bar of the A */}
      <path
        d="M32 68 L68 68 L64 72 L36 72 Z"
        fill="#F7F8FA"
        opacity="0"
      />
    </svg>
  )
}

export function AxiomWordmark({ height = 20 }: { height?: number }) {
  return (
    <svg
      height={height}
      viewBox="0 0 200 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="wm-grad" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F8F7FF" />
          <stop offset="100%" stopColor="#C060FF" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="32"
        fontFamily="'Inter Tight', sans-serif"
        fontWeight="800"
        fontSize="38"
        letterSpacing="-2"
        fill="url(#wm-grad)"
      >
        AXIOM
      </text>
    </svg>
  )
}
