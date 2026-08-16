'use client';

import { useEffect, useState } from 'react';
import { profile as staticProfile, tools } from '@/content/profile';
import { Led, Radar, SerialPlate } from './hardware';
import { Globe, Starburst, Waveform } from './y2k';

/**
 * The machine's main screen. The name is the only place Octavus appears.
 */
type ProfileData = typeof staticProfile & { portrait?: string };

export function Identity({ data = staticProfile }: { data?: ProfileData } = {}) {
  const profile = data;
  return (
    <div className="relative">
      <div className="crt crt-flicker relative overflow-hidden px-4 py-10 sm:px-8 sm:py-14 lg:py-20">
        <Sweep />
        <Instruments />

        <div className="relative z-10">
          <div className="crt-text flex flex-wrap items-center gap-x-3 gap-y-1">
            {profile.eyebrow.map((word, i) => (
              <span key={word} className="t-label text-phosphor">
                {i > 0 ? <span className="mr-3 opacity-40">//</span> : null}
                {word}
              </span>
            ))}
          </div>

          {/*
            Octavus Black is exceptionally wide — "VAIBHAV" measures 9.758em —
            so the size is derived from that metric rather than guessed. Both
            lines are set at their natural width; matching their lengths is not
            required and the forced tracking that did so has been removed.
          */}
          <h1 className="crt-text t-name mt-5 text-phosphor uppercase [font-size:clamp(1.7rem,7.4vw,6.6rem)]">
            <span className="block">{profile.first}</span>
            <span className="block">{profile.last}</span>
          </h1>

          <div className="mt-6 h-px w-full bg-phosphor/25" />

          <div className="mt-5 grid gap-5 lg:grid-cols-12 lg:items-end">
            <p className="crt-text max-w-xl text-pretty text-sm leading-relaxed text-phosphor/85 sm:text-base lg:col-span-7">
              {profile.lede}
            </p>

            <dl className="t-data grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] text-phosphor/70 lg:col-span-5">
              <Readout k="Status" v={profile.status} highlight />
              <Readout k="Location" v="Bengaluru, IN" />
              <Readout k="Discipline" v="Design / Build" />
              <Readout k="Grad" v="2028" />
            </dl>
          </div>
        </div>
      </div>

      {/* Machine housing below the screen: the physical controls. */}
      <div className="flex flex-col gap-3 border-t-2 border-navy bg-bone px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="flex flex-wrap gap-2">
          <a href="#work" className="btn btn-primary">
            Selected work
          </a>
          <a href="#transmit" className="btn">
            Contact
          </a>
          <a href={profile.contact.resume} className="btn">
            Résumé ↓
          </a>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <SerialPlate id="VR-2026-00" className="hidden sm:inline-flex" />
          <Led tone="rust" />
          <LiveClock />
        </div>
      </div>

      <ToolTicker />
    </div>
  );
}

function Readout({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="uppercase tracking-[0.18em] opacity-50">{k}</dt>
      <dd
        className={
          highlight
            ? 'crt-text bg-phosphor px-1.5 py-0.5 font-semibold text-crt'
            : 'crt-text text-phosphor'
        }
      >
        {v}
      </dd>
    </div>
  );
}

/** Real wall-clock time — the panel should report something true. */
function LiveClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Kolkata',
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="t-data text-[11px] uppercase tracking-[0.16em] text-navy/60">
      IST {time ?? '--:--:--'}
    </p>
  );
}

function Sweep() {
  return (
    <div
      aria-hidden
      className="crt-sweep pointer-events-none absolute inset-x-0 top-0 z-[2] h-16 bg-gradient-to-b from-transparent via-phosphor/[0.07] to-transparent"
    />
  );
}

/**
 * The instrument cluster behind the name: a rotating wireframe globe, a live
 * radar scope, and scattered starbursts. All decorative, all CSS/SVG.
 */
function Instruments() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Globe className="absolute -right-14 -top-10 h-64 w-64 text-phosphor/20 sm:h-80 sm:w-80" />
      <span className="absolute bottom-6 right-6 hidden w-24 opacity-70 lg:block">
        <Radar className="w-full" />
      </span>

      <Starburst className="absolute left-[6%] top-[14%] h-5 w-5 text-phosphor/30" />
      <Starburst className="absolute right-[28%] top-[8%] h-3 w-3 text-phosphor/25" />
      <Starburst className="absolute left-[42%] bottom-[12%] h-4 w-4 text-phosphor/20" />

      <Waveform
        bars={26}
        className="absolute bottom-5 left-4 hidden h-6 text-phosphor/30 sm:flex lg:left-8"
      />
    </div>
  );
}

function ToolTicker() {
  const track = [...tools, ...tools];

  return (
    <div
      aria-hidden
      className="overflow-hidden border-t-2 border-navy bg-navy py-1.5"
    >
      <div className="marquee-track">
        {track.map((tool, i) => (
          <span
            key={`${tool}-${i}`}
            className="t-label flex shrink-0 items-center gap-6 px-3 text-bone/80"
          >
            {tool}
            <span className="text-amber">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
