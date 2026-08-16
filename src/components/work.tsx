'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  builds as staticBuilds,
  designs as staticDesigns,
  type BuildProject,
  type DesignPiece,
} from '@/content/work';
import { Decal } from './hardware';

type Filter = 'all' | 'design' | 'build';

/**
 * Content arrives from the server (Supabase, with a static fallback). The props
 * default to the static content so this component still renders standalone.
 */
export function Work({
  designs = staticDesigns,
  builds = staticBuilds,
}: {
  designs?: DesignPiece[];
  builds?: BuildProject[];
} = {}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<number | null>(null);
  const reduced = useReducedMotion();

  // Counts depend on props, so they are derived here rather than at module scope.
  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: designs.length + builds.length },
    { id: 'design', label: 'Design', count: designs.length },
    { id: 'build', label: 'Build', count: builds.length },
  ];

  const showBuilds = filter === 'all' || filter === 'build';
  const showDesigns = filter === 'all' || filter === 'design';
  const pending = designs.filter((d) => !d.src).length;

  return (
    <div className="relative p-4 sm:p-6">
      <div className="halftone-field pointer-events-none absolute inset-0 opacity-[0.05]" />
      {/* Control strip */}
      <div className="panel-inset relative mb-5 flex flex-wrap items-center gap-2 p-2.5">
        <span className="t-label mr-1 hidden sm:block">Filter</span>
        <div role="tablist" aria-label="Filter work" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`btn py-1 text-[11px] ${active ? 'btn-primary' : ''}`}
              >
                {active ? <span aria-hidden>▸</span> : null}
                {f.label}
                <span className="opacity-60">{f.count}</span>
              </button>
            );
          })}
        </div>

        {pending > 0 ? (
          <span className="w-full shrink-0 sm:ml-auto sm:w-auto">
            <Decal>{pending} slots awaiting upload</Decal>
          </span>
        ) : null}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {showBuilds ? (
          <motion.ul
            key="builds"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="mb-5 grid gap-3 lg:grid-cols-2"
          >
            {builds.map((project) => (
              <li key={project.slug}>
                <a
                  href={project.href ?? '#easy-club'}
                  target={project.href ? '_blank' : undefined}
                  rel={project.href ? 'noreferrer' : undefined}
                  className="panel-inset group flex h-full flex-col gap-2 p-4 transition-colors hover:bg-amber"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="t-head text-lg uppercase">{project.title}</h3>
                    <span className="t-data text-[10px] uppercase tracking-[0.14em] opacity-60">
                      {project.year}
                    </span>
                  </div>
                  <p className="text-pretty text-sm leading-relaxed text-navy/80">
                    {project.summary}
                  </p>
                  <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {project.stack.map((tech) => (
                      <li
                        key={tech}
                        className="t-data border border-navy/40 px-1.5 py-0.5 text-[10px]"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                  {project.href ? (
                    <span className="t-label mt-1 text-rust group-hover:text-navy">
                      {project.hrefLabel} ↗
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="popLayout" initial={false}>
        {showDesigns ? (
          <motion.div
            key="designs"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="gallery"
          >
            {designs.map((piece, i) => (
              <Slot key={piece.slug} piece={piece} index={i} onOpen={() => setOpen(i)} />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Lightbox pieces={designs} index={open} onClose={() => setOpen(null)} onNavigate={setOpen} />
    </div>
  );
}

/**
 * One gallery cell. Renders the real image when `src` is present, and a
 * designed CRT placeholder — correct aspect ratio, expected filename — when
 * it is not, so an unfilled gallery still looks deliberate.
 */
function Slot({
  piece,
  index,
  onOpen,
}: {
  piece: DesignPiece;
  index: number;
  onOpen: () => void;
}) {
  const reduced = useReducedMotion();
  const filled = Boolean(piece.src);

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -6% 0px' }}
      transition={{ duration: 0.4, delay: reduced ? 0 : (index % 3) * 0.05 }}
    >
      <button
        type="button"
        onClick={filled ? onOpen : undefined}
        aria-label={
          filled
            ? `Open ${piece.title} for ${piece.context}`
            : `${piece.title} — image slot, awaiting upload`
        }
        aria-disabled={!filled}
        className={`panel group block w-full text-left shadow-[4px_4px_0_var(--color-navy)] ${
          filled ? 'hover:shadow-[6px_6px_0_var(--color-rust)]' : 'cursor-default'
        }`}
      >
        {filled ? (
          <Image
            src={piece.src as string}
            alt={piece.alt ?? `${piece.title} — ${piece.kind} for ${piece.context}`}
            width={1400}
            height={Math.round(1400 / piece.ratio)}
            unoptimized
            className="w-full border-b-2 border-navy bg-crt"
          />
        ) : (
          <EmptySlot piece={piece} />
        )}

        <div className="flex items-center justify-between gap-2 px-2.5 py-2">
          <div className="min-w-0">
            <p className="t-head truncate text-[13px] uppercase leading-tight">{piece.title}</p>
            <p className="t-data truncate text-[10px] uppercase tracking-[0.12em] text-navy/55">
              {piece.context}
            </p>
          </div>
          <span className="t-data shrink-0 border border-navy/40 px-1.5 py-0.5 text-[9px] uppercase">
            {piece.year}
          </span>
        </div>
      </button>
    </motion.div>
  );
}

function EmptySlot({ piece }: { piece: DesignPiece }) {
  return (
    <div
      className="crt relative flex items-center justify-center border-b-2 border-navy"
      style={{ aspectRatio: piece.ratio }}
    >
      {/* Corner registration brackets */}
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
          className={`absolute h-3 w-3 border-phosphor/45 ${pos}`}
        />
      ))}

      <div className="relative z-10 px-3 text-center">
        <p className="t-data crt-text text-[10px] uppercase tracking-[0.22em] text-phosphor/80">
          <span className="blink" aria-hidden>
            ▮
          </span>{' '}
          No signal
        </p>
        <p className="t-data mt-1.5 break-all text-[9px] leading-snug text-phosphor/40">
          /work/designs/
          <br />
          {piece.slug}.webp
        </p>
        <p className="t-data mt-1 text-[9px] text-phosphor/30">{piece.kind}</p>
      </div>
    </div>
  );
}

function Lightbox({
  pieces,
  index,
  onClose,
  onNavigate,
}: {
  pieces: DesignPiece[];
  index: number | null;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const isOpen = index !== null;
  const piece = isOpen ? pieces[index] : null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Safari lacks `closedby`, so light-dismiss needs the documented fallback.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    const onClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) dialog.close();
    };
    dialog.addEventListener('click', onClick);
    return () => dialog.removeEventListener('click', onClick);
  }, []);

  const step = useCallback(
    (delta: number) => {
      if (index === null) return;
      onNavigate((index + delta + pieces.length) % pieces.length);
    },
    [index, onNavigate, pieces.length],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, step]);

  return (
    <dialog
      ref={ref}
      closedby="any"
      className="lightbox"
      aria-label={piece ? `${piece.title}, ${piece.context}` : 'Viewer'}
      onClose={onClose}
    >
      {piece ? (
        <div className="flex h-full items-center justify-center p-3 sm:p-6">
          <div className="panel grid h-[80dvh] w-full max-w-3xl grid-rows-[auto_1fr] overflow-hidden">
            <header className="flex min-w-0 items-stretch justify-between border-b-2 border-navy bg-bone-dk">
              <div className="min-w-0 px-3 py-2">
                <p className="t-head truncate text-sm uppercase">{piece.title}</p>
                <p className="t-data truncate text-[10px] uppercase tracking-[0.12em] text-navy/60">
                  {piece.context} / {piece.kind} / {piece.year}
                </p>
              </div>
              <div className="flex shrink-0 items-stretch">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous"
                  className="w-10 border-l-2 border-navy bg-bone hover:bg-amber"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next"
                  className="w-10 border-l-2 border-navy bg-bone hover:bg-amber"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => ref.current?.close()}
                  aria-label="Close viewer"
                  className="w-10 border-l-2 border-navy bg-rust text-bone hover:bg-navy hover:text-rust"
                >
                  ✕
                </button>
              </div>
            </header>

            <div className="min-h-0 min-w-0 bg-bone-dk p-3">
              {piece.src ? (
                <div className="relative h-full w-full">
                  {/* A grid row's `1fr` track gets a genuinely definite size
                      once the grid container's height is resolved (here, by
                      max-height), unlike a flex-1 chain with only max-height
                      on the ancestor — which left `fill`'s containing block
                      height indefinite and collapsed it to ~0. */}
                  <Image
                    src={piece.src}
                    alt={piece.alt ?? `${piece.title} — ${piece.kind} for ${piece.context}`}
                    fill
                    unoptimized
                    className="border-2 border-navy bg-crt object-contain"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
