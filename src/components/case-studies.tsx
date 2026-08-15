'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { easyClub, opacitys } from '@/content/case-studies';
import { Barcode, Decal, Gauge, Led, SerialPlate } from './hardware';
import { Atom, Checker, Starburst, Waveform } from './y2k';

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.9, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Strip({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="crt flex items-center justify-between gap-3 border-2 border-navy px-3 py-1.5">
      <p className="t-label crt-text relative z-10 text-phosphor">{children}</p>
      {right ? <div className="relative z-10">{right}</div> : null}
    </div>
  );
}

/* ================================================================= */

export function EasyClub() {
  return (
    <div className="relative p-4 sm:p-6">
      <div className="halftone-field pointer-events-none absolute inset-0 opacity-[0.06]" />

      <div className="relative grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="t-head text-3xl uppercase sm:text-5xl">{easyClub.name}</h3>
              <Led tone="phosphor" />
              <span className="t-data text-[10px] uppercase tracking-[0.16em] text-navy/50">
                Live
              </span>
            </div>
            <p className="t-label mt-2 text-rust">{easyClub.tagline}</p>
            <p className="mt-4 text-pretty leading-relaxed text-navy/85">{easyClub.thesis}</p>
          </Reveal>

          <Reveal delay={0.08}>
            <a
              href={easyClub.href}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary mt-5"
            >
              Visit {easyClub.hrefLabel} ↗
            </a>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {easyClub.stack.map((tech) => (
                <span
                  key={tech}
                  className="t-data border-2 border-navy/30 px-2 py-1 text-[10px] uppercase"
                >
                  {tech}
                </span>
              ))}
            </div>
            <p className="t-data mt-3 text-[10px] uppercase tracking-[0.14em] text-navy/45">
              {easyClub.note}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="self-start lg:col-span-5">
          <ProductSlot path="/work/easy-club/product.webp" label="Easy Club" />
        </Reveal>
      </div>

      <Checker className="my-6" />

      <div className="relative grid gap-3 lg:grid-cols-3">
        {easyClub.pillars.map((pillar, i) => (
          <Reveal key={pillar.id} delay={i * 0.06}>
            <div className="panel-inset relative flex h-full flex-col">
              <Strip right={<span className="t-data text-[9px] text-phosphor/60">0{i + 1}</span>}>
                {pillar.name}
              </Strip>
              <div className="flex flex-1 flex-col p-3">
                <p className="text-sm leading-relaxed text-navy/80">{pillar.summary}</p>
                <ul className="mt-3 space-y-1.5">
                  {pillar.points.map((point) => (
                    <li key={point} className="flex gap-2 text-xs leading-relaxed text-navy/70">
                      <span aria-hidden className="mt-[3px] shrink-0 text-rust">
                        ▸
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 border-t-2 border-navy/15 pt-3">
        <SerialPlate id="EC-2025-001" />
        <Barcode label="easyclub" className="h-5" />
        <div className="ml-auto flex gap-4">
          <Gauge value={0.86} label="Coverage" />
          <Gauge value={0.72} label="Automation" />
        </div>
      </div>
    </div>
  );
}

/* ================================================================= */

export function Opacitys() {
  return (
    <div className="relative p-4 sm:p-6">
      <Starburst
        aria-hidden
        className="pointer-events-none absolute right-4 top-4 h-10 w-10 text-amber/40"
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="t-head text-3xl uppercase sm:text-5xl">{opacitys.name}</h3>
              <Led tone="phosphor" />
              <span className="t-data text-[10px] uppercase tracking-[0.16em] text-navy/50">
                Live
              </span>
            </div>
            <p className="t-label mt-2 text-rust">{opacitys.tagline}</p>
            <p className="mt-4 text-pretty leading-relaxed text-navy/85">{opacitys.thesis}</p>
          </Reveal>

          <Reveal delay={0.08}>
            <a
              href={opacitys.href}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary mt-5"
            >
              Visit {opacitys.hrefLabel} ↗
            </a>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {opacitys.stack.map((tech) => (
                <span
                  key={tech}
                  className="t-data border-2 border-navy/30 px-2 py-1 text-[10px] uppercase"
                >
                  {tech}
                </span>
              ))}
            </div>
            <p className="t-data mt-3 text-[10px] uppercase tracking-[0.14em] text-navy/45">
              {opacitys.note}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="self-start lg:col-span-5">
          <ProductSlot path="/work/opacitys/product.webp" label="Opacitys" />
        </Reveal>
      </div>

      {/* Ten modules as a systems-console matrix. */}
      <div className="mt-6">
        <Reveal>
          <Strip
            right={
              <span className="t-data text-[9px] text-phosphor/60">
                {opacitys.modules.length} MODULES
              </span>
            }
          >
            Module matrix
          </Strip>
        </Reveal>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {opacitys.modules.map((mod, i) => (
            <Reveal key={mod.id} delay={Math.min(i * 0.035, 0.25)}>
              <article className="panel-inset group flex h-full flex-col p-3 transition-colors hover:bg-amber/25">
                <div className="flex items-baseline justify-between gap-2">
                  {/*
                    "Correspondence" is long enough to run past a narrow card even
                    with room to spare on paper — text-pretty alone doesn't help
                    since it's a single word with no space to break on. break-words
                    forces a mid-word wrap as a hard floor, whatever the actual
                    rendered width turns out to be (viewport, zoom, font fallback).
                  */}
                  <h4 className="t-head min-w-0 flex-1 break-words text-sm uppercase leading-tight">
                    {mod.name}
                  </h4>
                  <span className="t-data shrink-0 text-[9px] text-rust">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-navy/75">{mod.line}</p>
                <p className="mt-2 border-t border-navy/15 pt-2 text-[10px] leading-relaxed text-navy/55">
                  {mod.detail}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Provider orchestration */}
      <Reveal delay={0.08}>
        <div className="crt relative mt-5 border-2 border-navy p-4">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="t-label crt-text text-phosphor">Provider orchestration</p>
              <Waveform bars={16} className="h-4 text-phosphor/60" />
            </div>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {opacitys.providers.map((p) => (
                <li
                  key={p}
                  className="t-data crt-text border border-phosphor/35 px-2 py-0.5 text-[10px] uppercase text-phosphor/85"
                >
                  {p}
                </li>
              ))}
            </ul>

            <ul className="mt-4 grid gap-1.5 lg:grid-cols-2">
              {opacitys.engineering.map((line) => (
                <li
                  key={line}
                  className="crt-text flex gap-2 text-[11px] leading-relaxed text-phosphor/70"
                >
                  <span aria-hidden className="mt-[2px] shrink-0 text-phosphor/50">
                    ▸
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t-2 border-navy/15 pt-3">
        <SerialPlate id="OP-2026-010" />
        <Barcode label="opacitys" className="h-5" />
        <Decal>Guidance, not legal advice</Decal>
        <Atom aria-hidden className="ml-auto h-8 w-8 text-navy/25" />
      </div>
    </div>
  );
}

/* ================================================================= */

/** Labelled CRT slot standing in until a product screenshot is supplied. */
function ProductSlot({ path, label }: { path: string; label: string }) {
  return (
    <div className="crt relative flex aspect-[4/3] items-center justify-center border-2 border-navy">
      {(
        [
          'left-1.5 top-1.5 border-l-2 border-t-2',
          'right-1.5 top-1.5 border-r-2 border-t-2',
          'left-1.5 bottom-1.5 border-b-2 border-l-2',
          'right-1.5 bottom-1.5 border-b-2 border-r-2',
        ] as const
      ).map((pos) => (
        <span key={pos} aria-hidden className={`absolute h-3 w-3 border-phosphor/45 ${pos}`} />
      ))}

      <div className="relative z-10 px-4 text-center">
        <p className="t-data crt-text text-[10px] uppercase tracking-[0.22em] text-phosphor/80">
          <span className="blink" aria-hidden>
            ▮
          </span>{' '}
          No signal
        </p>
        <p className="t-data mt-2 text-[9px] leading-snug text-phosphor/40">{label} capture</p>
        <p className="t-data mt-1 break-all text-[9px] leading-snug text-phosphor/30">{path}</p>
      </div>
    </div>
  );
}
