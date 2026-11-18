export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <rect x="1" y="1" width="28" height="28" rx="8" fill="#176475" />
      <path d="M8 21V12m7 9V9m7 12v-6M7 21h16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
