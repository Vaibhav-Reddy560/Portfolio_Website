/**
 * The machine layer: physical parts of the housing.
 *
 * Everything here is decoration and is marked aria-hidden — none of it carries
 * meaning a screen reader needs. Animation is limited to transform/opacity and
 * is disabled by the global prefers-reduced-motion block in globals.css.
 */

/** Four corner fixings, as on a bolted-down panel. */
export function Rivets() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20">
      {(
        [
          'left-1.5 top-1.5',
          'right-1.5 top-1.5',
          'left-1.5 bottom-1.5',
          'right-1.5 bottom-1.5',
        ] as const
      ).map((pos) => (
        <span
          key={pos}
          className={`absolute h-1.5 w-1.5 rounded-full bg-navy/45 shadow-[inset_0_-1px_0_rgba(237,230,214,0.5)] ${pos}`}
        />
      ))}
    </span>
  );
}

/** Louvre vent strip. */
export function Vents({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block bg-[repeating-linear-gradient(to_bottom,var(--color-navy)_0_1px,transparent_1px_3px)] opacity-30 ${className}`}
    />
  );
}

/** Barcode. Widths are derived from the label so each window gets its own. */
export function Barcode({ label, className = '' }: { label: string; className?: string }) {
  const bars = Array.from({ length: 34 }, (_, i) => {
    const code = label.charCodeAt(i % label.length) + i * 7;
    return (code % 3) + 1;
  });

  return (
    <span aria-hidden className={`flex items-end gap-px ${className}`}>
      {bars.map((w, i) => (
        <span
          key={i}
          className="h-full bg-navy/70"
          style={{ width: `${w}px` }}
        />
      ))}
    </span>
  );
}

/** Blinking status lamp. */
export function Led({
  tone = 'amber',
  className = '',
}: {
  tone?: 'amber' | 'rust' | 'phosphor';
  className?: string;
}) {
  const colour = {
    amber: 'bg-amber shadow-[0_0_6px_var(--color-amber)]',
    rust: 'bg-rust shadow-[0_0_6px_var(--color-rust)]',
    phosphor: 'bg-phosphor shadow-[0_0_6px_var(--color-phosphor)]',
  }[tone];

  return (
    <span
      aria-hidden
      className={`blink inline-block h-1.5 w-1.5 rounded-full ${colour} ${className}`}
    />
  );
}

/** Stencilled hazard decal. */
export function Decal({
  children,
  tone = 'rust',
}: {
  children: React.ReactNode;
  tone?: 'rust' | 'amber';
}) {
  const style =
    tone === 'rust'
      ? 'border-rust bg-rust/12 text-rust'
      : 'border-amber/70 bg-amber/15 text-navy';

  return (
    <span
      aria-hidden
      className={`t-data inline-flex items-center gap-1.5 border-2 border-dashed px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] ${style}`}
    >
      <span>⚠</span>
      {children}
    </span>
  );
}

/** Etched serial plate. */
export function SerialPlate({ id, className = '' }: { id: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`t-data inline-flex items-center gap-2 border border-navy/30 bg-bone-dk px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-navy/55 ${className}`}
    >
      <span className="text-navy/35">SER</span>
      {id}
    </span>
  );
}

/** Sweeping radar scope. The sweep is a rotating conic gradient. */
export function Radar({ className = '' }: { className?: string }) {
  // Deliberately always `relative` and never positioned by the caller: passing a
  // competing position utility in `className` would leave the winner up to
  // stylesheet order. Wrap this in a positioned element instead.
  return (
    <span
      aria-hidden
      className={`pointer-events-none relative block aspect-square overflow-hidden rounded-full border border-phosphor/30 ${className}`}
    >
      {[33, 66, 100].map((r) => (
        <span
          key={r}
          className="absolute rounded-full border border-phosphor/20"
          style={{ inset: `${(100 - r) / 2}%` }}
        />
      ))}
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-phosphor/15" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-phosphor/15" />
      <span
        className="radar-sweep absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, color-mix(in srgb, var(--color-phosphor) 45%, transparent) 360deg)',
        }}
      />
    </span>
  );
}

/** Needle gauge reading a 0–1 value. */
export function Gauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const angle = -90 + clamped * 180;

  return (
    <span aria-hidden className="flex flex-col items-center gap-1">
      <span className="relative block h-8 w-16 overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-16 rounded-full border-2 border-navy/25" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span
            key={t}
            className="absolute bottom-0 left-1/2 h-[26px] w-px origin-bottom bg-navy/25"
            style={{ transform: `rotate(${-90 + t * 180}deg)` }}
          />
        ))}
        <span
          className="absolute bottom-0 left-1/2 h-[24px] w-[2px] origin-bottom bg-rust"
          style={{ transform: `rotate(${angle}deg)` }}
        />
        <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-navy" />
      </span>
      <span className="t-data text-[8px] uppercase tracking-[0.14em] text-navy/55">
        {label}
      </span>
    </span>
  );
}
