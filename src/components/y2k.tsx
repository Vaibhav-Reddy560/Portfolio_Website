/**
 * The graphic layer: Y2K / acid-era ornament drawn from the reference asset
 * sheet. All decorative and aria-hidden; all pure SVG or CSS, no image files.
 */

/** Rotating wireframe globe. */
export function Globe({ className = '', spin = true }: { className?: string; spin?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className={`${spin ? 'globe-spin' : ''} ${className}`}
    >
      <circle cx="100" cy="100" r="72" />
      {[18, 36, 54, 72].map((rx) => (
        <ellipse key={rx} cx="100" cy="100" rx={rx} ry="72" />
      ))}
      {[-48, -24, 0, 24, 48].map((dy) => (
        <line key={dy} x1="28" y1={100 + dy} x2="172" y2={100 + dy} opacity="0.55" />
      ))}
    </svg>
  );
}

/** Four-point starburst. */
export function Starburst({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className} fill="currentColor">
      <path d="M50 0c3 30 17 47 50 50-33 3-47 20-50 50-3-30-17-47-50-50 33-3 47-20 50-50Z" />
    </svg>
  );
}

/** Orbiting atom rings. */
export function Atom({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <ellipse cx="60" cy="60" rx="54" ry="22" />
      <ellipse cx="60" cy="60" rx="54" ry="22" transform="rotate(60 60 60)" />
      <ellipse cx="60" cy="60" rx="54" ry="22" transform="rotate(120 60 60)" />
      <circle cx="60" cy="60" r="6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Chrome tribal ornament — a divider between major windows. */
export function Ornament({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 40"
      fill="currentColor"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M200 4c14 10 30 14 52 12-16 6-26 12-30 20 18-4 34-2 48 6-24-2-42 2-54 12 8-12 6-22-4-30-6-5-8-12-12-20Z" />
      <path d="M200 4c-14 10-30 14-52 12 16 6 26 12 30 20-18-4-34-2-48 6 24-2 42 2 54 12-8-12-6-22 4-30 6-5 8-12 12-20Z" />
      <path d="M112 20c-24-6-48-6-72 0 24 6 48 6 72 0Z" opacity="0.7" />
      <path d="M288 20c24-6 48-6 72 0-24 6-48 6-72 0Z" opacity="0.7" />
    </svg>
  );
}

/** Animated equaliser bars. Heights come from the index, so they are stable. */
export function Waveform({ bars = 20, className = '' }: { bars?: number; className?: string }) {
  return (
    <span aria-hidden className={`flex items-end gap-[2px] ${className}`}>
      {Array.from({ length: bars }, (_, i) => {
        const h = 30 + ((i * 37) % 70);
        return (
          <span
            key={i}
            className="wave-bar w-[3px] bg-current"
            style={{ height: `${h}%`, animationDelay: `${(i % 7) * 0.11}s` }}
          />
        );
      })}
    </span>
  );
}

/** Checkerboard rule. */
export function Checker({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`checker block ${className}`} />;
}
