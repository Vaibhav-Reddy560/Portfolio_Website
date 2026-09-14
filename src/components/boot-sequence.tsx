'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { profile } from '@/content/profile';

const LINES = [
  'CONTROL PANEL BIOS v2.6 — INITIALISING',
  'MEM CHECK ............ 65536 KB OK',
  'GFX SUBSYSTEM ........ CRT PHOSPHOR / AMBER',
  'TYPEFACE BUS ......... OCTAVUS / RARE / JURA',
  'MOUNTING /PERSONNEL/ .............. OK',
  'DECODING 22 DESIGN RECORDS ........ OK',
  'LINK easyclub.in .................. ONLINE',
  '',
  'OPERATOR IDENTIFIED:',
];

const STORAGE_KEY = 'boot-done';

/**
 * Runs once per session. Skippable, and skipped outright for anyone who has
 * asked for reduced motion — the site underneath is fully rendered the whole
 * time, so this never gates access to content.
 *
 * `active` defaults to `true` — matching what the server renders — so the
 * overlay is present from the very first painted frame with no client-only
 * mount flashing the bare site first. For a visitor who has already seen it
 * this session, the blocking script in layout.tsx has already hidden it via
 * CSS (`[data-booted] .boot-overlay`) before this component ever hydrates;
 * the effect below just syncs React's own state to match, so it stops
 * rendering the (already invisible) overlay rather than leaving it — and its
 * timers and key/pointer listeners — sitting around doing nothing.
 */
export function BootSequence() {
  const [active, setActive] = useState(true);
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
    setDone(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* private mode — it simply replays next time */
    }
    // Also set the attribute, not just the sessionStorage flag the inline
    // script in layout.tsx reads on load. `html:not([data-booted])` paints the
    // black CRT background that keeps the boot overlay from flashing — leaving
    // it unset here meant the page stayed black behind the site for the rest
    // of the session, and only came right after a reload.
    document.documentElement.setAttribute('data-booted', '1');
    setTimeout(() => setActive(false), 420);
  }, []);

  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      seen = false;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || reduced) {
      setActive(false);
      return;
    }

    document.body.style.overflow = 'hidden';

    LINES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setShown(i + 1), 170 * (i + 1)));
    });
    timers.current.push(setTimeout(finish, 170 * LINES.length + 1100));

    return () => {
      for (const t of timers.current) clearTimeout(t);
    };
  }, [finish]);

  // Restore scrolling whenever the overlay goes away, however it went away.
  useEffect(() => {
    if (!active) document.body.style.overflow = '';
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const skip = () => finish();
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [active, finish]);

  if (!active) return null;

  return (
    <div
      // aria-hidden: the real page is already in the DOM behind this, so screen
      // readers should read that rather than a decorative animation.
      aria-hidden
      className={`boot-overlay crt fixed inset-0 z-[900] flex flex-col justify-center px-5 transition-opacity duration-[400ms] sm:px-12 ${
        done ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative z-10 mx-auto w-full max-w-3xl">
        {LINES.slice(0, shown).map((line, i) => (
          <p
            key={line || `blank-${i}`}
            className="t-data crt-text text-[11px] leading-relaxed text-phosphor/80 sm:text-sm"
          >
            {line ? `> ${line}` : ' '}
          </p>
        ))}

        {shown >= LINES.length ? (
          <p className="t-name crt-text mt-3 text-phosphor uppercase [font-size:clamp(1.6rem,7vw,4.5rem)]">
            {profile.first} {profile.last}
          </p>
        ) : (
          <span className="blink t-data text-phosphor" aria-hidden>
            ▮
          </span>
        )}
      </div>

      <p className="t-label absolute inset-x-0 bottom-6 text-center text-phosphor/40">
        Press any key to skip
      </p>
    </div>
  );
}
