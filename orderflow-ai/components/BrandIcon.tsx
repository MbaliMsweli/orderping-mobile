'use client';

export default function BrandIcon({ size = 32 }: { size?: number }) {
  const h = Math.round(size * 1.35);
  return (
    <svg
      viewBox="0 0 44 60"
      width={size}
      height={h}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Radiating lines — upper left */}
      <line x1="7" y1="9"  x2="3"  y2="5"  stroke="#1A56E8" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="5" y1="17" x2="0"  y2="17" stroke="#1A56E8" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="7" y1="25" x2="3"  y2="29" stroke="#1A56E8" strokeWidth="2.4" strokeLinecap="round"/>

      {/* Location pin — blue circle + downward point */}
      <circle cx="26" cy="19" r="16" fill="#1A56E8"/>
      <path d="M17 31 L26 56 L35 31" fill="#1A56E8"/>

      {/* White inner circle */}
      <circle cx="26" cy="19" r="10" fill="white"/>

      {/* Blue bell inside white circle */}
      {/* handle / loop at top */}
      <path
        d="M24.2 12.5 C24.2 11.5 24.9 11 26 11 C27.1 11 27.8 11.5 27.8 12.5"
        stroke="#1A56E8" strokeWidth="1.8" strokeLinecap="round" fill="none"
      />
      {/* bell dome */}
      <path
        d="M26 13 C22.4 13 19.5 15.9 19.5 19.5 C19.5 22.2 17.8 23.5 17.8 23.5 H34.2 C34.2 23.5 32.5 22.2 32.5 19.5 C32.5 15.9 29.6 13 26 13 Z"
        fill="#1A56E8"
      />
      {/* clapper */}
      <circle cx="26" cy="24.8" r="2" fill="#1A56E8"/>
    </svg>
  );
}
