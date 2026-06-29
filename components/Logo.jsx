// MasterStocks logo mark: a champagne-gold gem holding rising candlesticks.
export default function Logo({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="msGem"
          x1="0"
          y1="0"
          x2="48"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2a2114" />
          <stop offset="0.55" stopColor="#7a5a24" />
          <stop offset="1" stopColor="#c79a4e" />
        </linearGradient>
        <linearGradient
          id="msBar"
          x1="0"
          y1="8"
          x2="0"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffe9bf" />
          <stop offset="1" stopColor="#d8ac5e" />
        </linearGradient>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="13"
        fill="url(#msGem)"
        stroke="#c79a4e"
        strokeOpacity="0.55"
      />
      <g stroke="url(#msBar)" strokeWidth="1.6" strokeLinecap="round">
        <line x1="15" y1="21" x2="15" y2="33" />
        <line x1="24" y1="16" x2="24" y2="31" />
        <line x1="33" y1="10" x2="33" y2="27" />
      </g>
      <rect x="12" y="24" width="6" height="7" rx="1.6" fill="url(#msBar)" />
      <rect x="21" y="19" width="6" height="10" rx="1.6" fill="url(#msBar)" />
      <rect x="30" y="13" width="6" height="12" rx="1.6" fill="url(#msBar)" />
      <circle cx="33" cy="10" r="2" fill="#ffe9bf" />
    </svg>
  );
}
