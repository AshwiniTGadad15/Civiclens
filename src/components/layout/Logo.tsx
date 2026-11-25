export function CivicLensLogo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Location pin outer silhouette */}
      <path
        d="M18 3C10.82 3 5 8.82 5 16C5 24.4 15.65 32.1 17.34 33.27C17.74 33.55 18.26 33.55 18.66 33.27C20.35 32.1 31 24.4 31 16C31 8.82 25.18 3 18 3Z"
        stroke="#19C98A"
        strokeWidth="2"
        fill="#102338"
      />
      {/* Eye arc */}
      <path
        d="M10.2 16C12.1 12.7 14.9 11.1 18 11.1C21.1 11.1 23.9 12.7 25.8 16C23.9 19.3 21.1 20.9 18 20.9C14.9 20.9 12.1 19.3 10.2 16Z"
        stroke="#48E6B0"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {/* Precision iris & civic reticle */}
      <circle cx="18" cy="16" r="2.7" fill="#19C98A" />
      <circle cx="18" cy="16" r="1.1" fill="#07111F" />
    </svg>
  );
}
