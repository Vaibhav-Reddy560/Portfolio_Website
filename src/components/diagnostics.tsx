'use client';

import { useEffect, useRef, useState } from 'react';

/** Must stay in sync with the <Win> ids in app/page.tsx. */
const MODULES = [
  ['identity', 'IDENTITY'],
  ['work', 'SELECTED WORK'],
  ['easy-club', 'EASY CLUB'],
  ['opacitys', 'OPACITYS'],
  ['personnel', 'PERSONNEL FILE'],
  ['service', 'EXPERIENCE'],
  ['capabilities', 'SKILLS'],
  ['education', 'EDUCATION'],
  ['transmit', 'CONTACT'],
] as const;

/**
 * Live telemetry panel. Every value is read from the DOM — nothing here is
 * decorative fiction. Draggable on desktop, collapsed by default on small
 * screens where it would otherwise cover content.
 */
export function Diagnostics() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [module, setModule] = useState('IDENTITY');
  const [depth, setDepth] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const canvas = useRef<HTMLCanvasElement>(null);
  const trace = useRef<number[]>(new Array(48).fill(0));
  const lastY = useRef(0);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setOpen(window.matchMedia('(min-width: 1024px)').matches);
    setViewport({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let frame = 0;

    const read = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const y = window.scrollY;
      setDepth(max > 0 ? Math.min(100, Math.round((y / max) * 100)) : 0);

      // Scroll velocity feeds the oscilloscope trace.
      trace.current.push(Math.max(-1, Math.min(1, (y - lastY.current) / 60)));
      trace.current.shift();
      lastY.current = y;

      // Scroll-spy: a module becomes active once its top crosses the 40% line,
      // and stays active until the next one does. That means taking the LOWEST
      // module that has crossed — i.e. the largest top — not the smallest, which
      // would keep reporting whichever section had already scrolled past.
      let best = '';
      let bestTop = Number.NEGATIVE_INFINITY;
      const line = window.innerHeight * 0.4;
      for (const [id, label] of MODULES) {
        const node = document.getElementById(id);
        if (!node) continue;
        const { top } = node.getBoundingClientRect();
        if (top <= line && top > bestTop) {
          bestTop = top;
          best = label;
        }
      }
      if (best) setModule(best);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        read();
      });
    };
    const onPointer = (e: PointerEvent) =>
      setPointer({ x: Math.round(e.clientX), y: Math.round(e.clientY) });
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });

    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mounted]);

  // Oscilloscope
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const draw = () => {
      const c = canvas.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          const { width: w, height: h } = c;
          ctx.clearRect(0, 0, w, h);
          ctx.strokeStyle = '#F0A030';
          ctx.lineWidth = 1;
          ctx.beginPath();
          trace.current.forEach((v, i) => {
            const x = (i / (trace.current.length - 1)) * w;
            const y = h / 2 - v * (h / 2 - 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const node = panel.current;
    if (!node || !window.matchMedia('(min-width: 1024px)').matches) return;
    const r = node.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const node = panel.current;
    if (!node) return;
    setPos({
      x: Math.min(Math.max(e.clientX - drag.current.dx, 4), window.innerWidth - node.offsetWidth - 4),
      y: Math.min(Math.max(e.clientY - drag.current.dy, 4), window.innerHeight - 44),
    });
  };

  const endDrag = (e: React.PointerEvent) => {
    drag.current = null;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  if (!mounted) return null;

  return (
    <div
      ref={panel}
      className="fixed z-[300] w-[13.5rem]"
      style={
        pos
          ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
          : { right: '1rem', bottom: '1rem' }
      }
    >
      <div className="panel shadow-[4px_4px_0_var(--color-navy)]">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex items-center justify-between border-b-2 border-navy bg-bone-dk px-2 py-1 lg:cursor-grab lg:active:cursor-grabbing"
        >
          <span className="t-label text-[9px]">Diagnostics</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Collapse diagnostics' : 'Expand diagnostics'}
            className="border-2 border-navy bg-bone px-1.5 text-[9px] leading-4 hover:bg-amber"
          >
            <span aria-hidden>{open ? '▁' : '▢'}</span>
          </button>
        </div>

        {open ? (
          <div className="crt relative px-2 py-2">
            <dl className="relative z-10 space-y-1">
              <Row k="MODULE" v={module} />
              <Row k="DEPTH" v={`${String(depth).padStart(3, '0')}%`} />
              <Row k="PTR" v={`${pointer.x},${pointer.y}`} />
              <Row k="VIEW" v={`${viewport.w}×${viewport.h}`} />
            </dl>

            <div className="relative z-10 mt-2 border border-phosphor/25">
              <canvas ref={canvas} width={200} height={30} className="block h-[30px] w-full" />
            </div>

            <div className="relative z-10 mt-1.5 h-1.5 border border-phosphor/25">
              <div className="h-full bg-phosphor/70" style={{ width: `${depth}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="t-data text-[9px] text-phosphor/45">{k}</dt>
      <dd className="t-data crt-text truncate text-[9px] text-phosphor">{v}</dd>
    </div>
  );
}
