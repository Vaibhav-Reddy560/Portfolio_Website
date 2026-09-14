'use client';

import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  normalizeEngineering,
  normalizeFeatures,
  normalizeModules,
  normalizeProviders,
} from '@/lib/case-study-shape';
import type { CaseStudyProject } from '@/lib/content';
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

/* ------------------------------------------------------------- serial ---- */

/** e.g. "satquery-ai", "2026" -> "SA-2026-001" — used only when a project has no explicit accent. */
function deriveSerial(slug: string, year?: string): string {
  const acronym =
    slug
      .split('-')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3) || 'PR';
  const resolvedYear = year?.match(/\d{4}/)?.[0] ?? String(new Date().getFullYear());
  return `${acronym}-${resolvedYear}-001`;
}

/* ---------------------------------------------------------------- accent -- */

/**
 * Per-slug decoration that isn't derivable from project data — Easy Club's
 * coverage/automation gauges and Opacitys' "guidance, not legal advice" decal
 * are specific claims about those two products, not generic case-study
 * furniture. Everything else in this component is fully data-driven; a new
 * project gets a clean default (no corner ornament, no footer extra) rather
 * than an accent map entry making something up on its behalf.
 */
const ACCENTS: Record<
  string,
  { corner?: 'halftone' | 'starburst'; serialId?: string; footerExtra?: ReactNode }
> = {
  'easy-club': {
    corner: 'halftone',
    serialId: 'EC-2025-001',
    footerExtra: (
      <div className="ml-auto flex gap-4">
        <Gauge value={0.86} label="Coverage" />
        <Gauge value={0.72} label="Automation" />
      </div>
    ),
  },
  opacitys: {
    corner: 'starburst',
    serialId: 'OP-2026-010',
    footerExtra: (
      <>
        <Decal>Guidance, not legal advice</Decal>
        <Atom aria-hidden className="ml-auto h-8 w-8 text-navy/25" />
      </>
    ),
  },
};

/* ================================================================= */

export function CaseStudy({ data }: { data: CaseStudyProject }) {
  const accent = ACCENTS[data.slug];
  const features = normalizeFeatures(data.detail.pillars);
  const modules = normalizeModules(data.detail.modules);
  const providers = normalizeProviders(data.detail.providers);
  const engineering = normalizeEngineering(data.detail.engineering);
  const hasOrchestration = providers.length > 0 || engineering.length > 0;

  return (
    <div className="relative p-4 sm:p-6">
      {accent?.corner === 'halftone' ? (
        <div className="halftone-field pointer-events-none absolute inset-0 opacity-[0.06]" />
      ) : accent?.corner === 'starburst' ? (
        <Starburst
          aria-hidden
          className="pointer-events-none absolute right-4 top-4 h-10 w-10 text-amber/40"
        />
      ) : null}

      <div className="relative grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="t-head text-3xl uppercase sm:text-5xl">{data.name}</h3>
              <Led tone="phosphor" />
              <span className="t-data text-[10px] uppercase tracking-[0.16em] text-navy/50">
                Live
              </span>
            </div>
            {data.tagline ? <p className="t-label mt-2 text-rust">{data.tagline}</p> : null}
            {data.thesis ? (
              <p className="mt-4 text-pretty leading-relaxed text-navy/85">{data.thesis}</p>
            ) : null}
          </Reveal>

          <Reveal delay={0.08}>
            {data.href ? (
              <a
                href={data.href}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary mt-5"
              >
                Visit {data.hrefLabel ?? data.href} ↗
              </a>
            ) : null}
            {data.stack.length ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {data.stack.map((tech) => (
                  <span
                    key={tech}
                    className="t-data border-2 border-navy/30 px-2 py-1 text-[10px] uppercase"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            ) : null}
            {data.note ? (
              <p className="t-data mt-3 text-[10px] uppercase tracking-[0.14em] text-navy/45">
                {data.note}
              </p>
            ) : null}
          </Reveal>
        </div>

        <Reveal delay={0.1} className="self-start lg:col-span-5">
          <ProductSlot
            src={data.image}
            path={data.image ?? `projects/${data.slug}/product.png`}
            label={data.name}
            alt={data.alt ?? `${data.name} product screenshot`}
            blurDataURL={data.blurDataURL}
            ratio={1400 / 910}
          />
        </Reveal>
      </div>

      {features.length ? (
        <>
          <Checker className="my-6" />
          <div className="relative grid gap-3 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Reveal key={feature.id} delay={i * 0.06}>
                <div className="panel-inset relative flex h-full flex-col">
                  <Strip
                    right={<span className="t-data text-[9px] text-phosphor/60">0{i + 1}</span>}
                  >
                    {feature.name}
                  </Strip>
                  <div className="flex flex-1 flex-col p-3">
                    {feature.summary ? (
                      <p className="text-sm leading-relaxed text-navy/80">{feature.summary}</p>
                    ) : null}
                    {feature.points.length ? (
                      <ul className="mt-3 space-y-1.5">
                        {feature.points.map((point) => (
                          <li
                            key={point}
                            className="flex gap-2 text-xs leading-relaxed text-navy/70"
                          >
                            <span aria-hidden className="mt-[3px] shrink-0 text-rust">
                              ▸
                            </span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </>
      ) : null}

      {modules.length ? (
        <div className="mt-6">
          <Reveal>
            <Strip
              right={
                <span className="t-data text-[9px] text-phosphor/60">
                  {modules.length} MODULES
                </span>
              }
            >
              Module matrix
            </Strip>
          </Reveal>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {modules.map((mod, i) => (
              <Reveal key={mod.id} delay={Math.min(i * 0.035, 0.25)}>
                <article className="panel-inset group flex h-full flex-col p-3 transition-colors hover:bg-amber/25">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="t-head min-w-0 flex-1 break-words text-sm uppercase leading-tight">
                      {mod.name}
                    </h4>
                    <span className="t-data shrink-0 text-[9px] text-rust">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  {mod.line ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-navy/75">{mod.line}</p>
                  ) : null}
                  {mod.detail ? (
                    <p className="mt-2 border-t border-navy/15 pt-2 text-[10px] leading-relaxed text-navy/55">
                      {mod.detail}
                    </p>
                  ) : null}
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      ) : null}

      {hasOrchestration ? (
        <Reveal delay={0.08}>
          <div className="crt relative mt-5 border-2 border-navy p-4">
            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="t-label crt-text text-phosphor">Provider orchestration</p>
                <Waveform bars={16} className="h-4 text-phosphor/60" />
              </div>

              {providers.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {providers.map((p) => (
                    <li
                      key={p.label}
                      title={p.detail}
                      className="t-data crt-text border border-phosphor/35 px-2 py-0.5 text-[10px] uppercase text-phosphor/85"
                    >
                      {p.label}
                    </li>
                  ))}
                </ul>
              ) : null}

              {engineering.length ? (
                <ul className="mt-4 grid gap-1.5 lg:grid-cols-2">
                  {engineering.map((line) => (
                    <li
                      key={line.label ?? line.text}
                      className="crt-text flex gap-2 text-[11px] leading-relaxed text-phosphor/70"
                    >
                      <span aria-hidden className="mt-[2px] shrink-0 text-phosphor/50">
                        ▸
                      </span>
                      <span>
                        {line.label ? (
                          <strong className="font-semibold text-phosphor/90">
                            {line.label}:{' '}
                          </strong>
                        ) : null}
                        {line.text}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Reveal>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t-2 border-navy/15 pt-3">
        <SerialPlate id={accent?.serialId ?? deriveSerial(data.slug, data.year)} />
        <Barcode label={data.slug.replace(/-/g, '')} className="h-5" />
        {accent?.footerExtra}
      </div>
    </div>
  );
}

/* ================================================================= */

/**
 * Labelled screen slot: a real screenshot when `src` is supplied, otherwise a
 * CRT "NO SIGNAL" placeholder.
 *
 * The two are deliberately built differently. The empty state uses the `.crt`
 * class for its scanline + phosphor-bloom overlay — appropriate there, since
 * there's no image to obscure. A real screenshot skips `.crt` entirely and
 * uses a plain dark ground instead, so the picture reads clean rather than
 * washed out under a texture meant for glowing text.
 *
 * `ratio` (width / height) sizes the frame to match the actual image, so
 * `object-cover` has nothing to crop — pass the source image's real ratio.
 */
export function ProductSlot({
  src,
  path,
  label,
  alt,
  blurDataURL,
  ratio = 4 / 3,
}: {
  src?: string;
  path: string;
  label: string;
  alt?: string;
  blurDataURL?: string;
  ratio?: number;
}) {
  return (
    <div
      className="relative flex items-center justify-center overflow-hidden border-2 border-navy bg-crt"
      style={{ aspectRatio: ratio }}
    >
      {(
        [
          'left-1.5 top-1.5 border-l-2 border-t-2',
          'right-1.5 top-1.5 border-r-2 border-t-2',
          'left-1.5 bottom-1.5 border-b-2 border-l-2',
          'right-1.5 bottom-1.5 border-b-2 border-r-2',
        ] as const
      ).map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={`absolute z-10 h-3 w-3 border-phosphor/60 ${pos}`}
        />
      ))}

      {src ? (
        <Image
          src={src}
          alt={alt ?? `${label} product screenshot`}
          fill
          unoptimized
          placeholder={blurDataURL ? 'blur' : undefined}
          blurDataURL={blurDataURL}
          className="object-cover"
        />
      ) : (
        <div className="crt absolute inset-0 flex items-center justify-center">
          <div className="relative z-10 px-4 text-center">
            <p className="t-data crt-text text-[10px] uppercase tracking-[0.22em] text-phosphor/80">
              <span className="blink" aria-hidden>
                ▮
              </span>{' '}
              No signal
            </p>
            <p className="t-data mt-2 text-[9px] leading-snug text-phosphor/40">
              {label} capture
            </p>
            <p className="t-data mt-1 break-all text-[9px] leading-snug text-phosphor/30">
              {path}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
