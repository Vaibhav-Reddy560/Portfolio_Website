'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Barcode, Led, Rivets, SerialPlate, Vents } from './hardware';

type WindowState = {
  id: string;
  title: string;
  index: string;
  minimised: boolean;
  closed: boolean;
  /** Non-null once the window has been dragged out of the document flow. */
  popped: { x: number; y: number } | null;
  z: number;
};

type Registry = Record<string, WindowState>;

type Ctx = {
  windows: Registry;
  order: string[];
  register: (w: Pick<WindowState, 'id' | 'title' | 'index'>) => void;
  toggleMinimise: (id: string) => void;
  close: (id: string) => void;
  restore: (id: string) => void;
  pop: (id: string, x: number, y: number) => void;
  dock: (id: string) => void;
  focus: (id: string) => void;
  resetAll: () => void;
  canDrag: boolean;
};

const WindowCtx = createContext<Ctx | null>(null);

function useWindowSystem() {
  const ctx = useContext(WindowCtx);
  if (!ctx) throw new Error('Window components must be inside <WindowProvider>');
  return ctx;
}

export function WindowProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<Registry>({});
  const [order, setOrder] = useState<string[]>([]);
  const [canDrag, setCanDrag] = useState(false);
  /**
   * Stacking order, deliberate: popped windows (310–389) sit above the
   * diagnostics HUD (300) so a focused window is never blocked by it, and
   * below the taskbar (400), which is the global control and always reachable.
   */
  const topZ = useRef(Z_WINDOW_BASE);

  // Dragging is a desktop-pointer enhancement only. Re-evaluated on resize so
  // rotating a tablet doesn't strand a window outside the viewport.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
    const sync = () => {
      setCanDrag(mq.matches);
      if (!mq.matches) {
        setWindows((prev) => {
          const next: Registry = {};
          for (const [id, w] of Object.entries(prev)) next[id] = { ...w, popped: null };
          return next;
        });
      }
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const register = useCallback((w: Pick<WindowState, 'id' | 'title' | 'index'>) => {
    setWindows((prev) => {
      if (prev[w.id]) return prev;
      return {
        ...prev,
        [w.id]: { ...w, minimised: false, closed: false, popped: null, z: Z_WINDOW_BASE },
      };
    });
    setOrder((prev) => (prev.includes(w.id) ? prev : [...prev, w.id]));
  }, []);

  const update = useCallback((id: string, patch: Partial<WindowState>) => {
    setWindows((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
  }, []);

  const focus = useCallback(
    (id: string) => {
      topZ.current = Math.min(topZ.current + 1, Z_WINDOW_MAX);
      update(id, { z: topZ.current });
    },
    [update],
  );

  const value = useMemo<Ctx>(
    () => ({
      windows,
      order,
      register,
      canDrag,
      focus,
      toggleMinimise: (id) =>
        setWindows((prev) =>
          prev[id] ? { ...prev, [id]: { ...prev[id], minimised: !prev[id].minimised } } : prev,
        ),
      close: (id) => update(id, { closed: true, popped: null }),
      restore: (id) => {
        update(id, { closed: false, minimised: false });
        // Bring the restored window into view rather than leaving the reader lost.
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ block: 'start' });
        });
      },
      pop: (id, x, y) => {
        topZ.current = Math.min(topZ.current + 1, Z_WINDOW_MAX);
        update(id, { popped: { x, y }, z: topZ.current });
      },
      dock: (id) => update(id, { popped: null }),
      resetAll: () =>
        setWindows((prev) => {
          const next: Registry = {};
          for (const [id, w] of Object.entries(prev)) {
            next[id] = { ...w, minimised: false, closed: false, popped: null, z: Z_WINDOW_BASE };
          }
          return next;
        }),
    }),
    [windows, order, register, canDrag, focus, update],
  );

  return (
    <WindowCtx.Provider value={value}>
      {children}
      <Taskbar />
    </WindowCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */

export function Win({
  id,
  index,
  title,
  children,
  tone = 'bone',
  className = '',
}: {
  id: string;
  index: string;
  title: string;
  children: ReactNode;
  tone?: 'bone' | 'crt';
  className?: string;
}) {
  const { windows, register, toggleMinimise, close, pop, dock, focus, canDrag } =
    useWindowSystem();
  const state = windows[id];
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    register({ id, title, index });
  }, [register, id, title, index]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (!canDrag) return;
    // Never start a drag from the window controls themselves.
    if ((event.target as HTMLElement).closest('button')) return;
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    focus(id);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current || !canDrag) return;
    const node = ref.current;
    if (!node) return;

    const width = node.offsetWidth;
    // The window controls sit at the right edge of the title bar, so the whole
    // window is kept on screen horizontally rather than just a left-hand strip —
    // otherwise dragging right carries close/return out of reach. Vertically the
    // taskbar zone is reserved for the same reason.
    const x = clamp(event.clientX - drag.current.dx, 8, Math.max(8, window.innerWidth - width - 8));
    const y = clamp(event.clientY - drag.current.dy, 8, window.innerHeight - TASKBAR_SAFE);
    pop(id, x, y);
  };

  const endDrag = (event: React.PointerEvent) => {
    drag.current = null;
    const el = event.currentTarget as HTMLElement;
    if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId);
  };

  if (state?.closed) {
    return <FlowGhost id={id} title={title} index={index} />;
  }

  const popped = state?.popped ?? null;

  return (
    <>
      {popped ? <FlowGhost id={`${id}-ghost`} title={title} index={index} muted /> : null}

      <section
        ref={ref}
        id={id}
        aria-labelledby={`${id}-title`}
        onPointerDown={() => popped && focus(id)}
        className={`panel relative ${popped ? 'w-[min(64rem,92vw)]' : 'w-full'} ${className}`}
        style={
          popped
            ? { position: 'fixed', left: popped.x, top: popped.y, zIndex: state?.z ?? Z_WINDOW_BASE }
            : undefined
        }
      >
        <Rivets />

        {/* Title bar — the drag handle and the window controls. */}
        <header
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`flex items-stretch justify-between border-b-2 border-navy bg-bone-dk ${
            canDrag ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          <div className="flex min-w-0 items-center gap-2 px-2 py-1.5 sm:gap-3 sm:px-3">
            <span className="t-data shrink-0 border-2 border-navy bg-navy px-1.5 py-0.5 text-[10px] text-amber">
              {index}
            </span>
            <Led tone={popped ? 'rust' : 'amber'} />
            <h2
              id={`${id}-title`}
              className="t-head truncate text-sm uppercase tracking-wide sm:text-base"
            >
              {title}
            </h2>
          </div>

          {/* Hazard band fills the slack so the bar always reads as machined. */}
          <div className="mx-1 my-2 hidden flex-1 items-center gap-2 sm:flex">
            <div className="hazard-thin h-full flex-1 opacity-70" />
            <Vents className="h-full w-8 shrink-0" />
            <SerialPlate id={`${index}-VR26`} className="shrink-0" />
            <Barcode label={id} className="h-4 shrink-0" />
          </div>

          <div className="flex shrink-0 items-stretch">
            <WinButton
              label={state?.minimised ? `Expand ${title}` : `Collapse ${title}`}
              onClick={() => toggleMinimise(id)}
              expanded={!state?.minimised}
            >
              {state?.minimised ? '▢' : '▁'}
            </WinButton>
            {popped ? (
              <WinButton label={`Return ${title} to the page`} onClick={() => dock(id)}>
                ⤓
              </WinButton>
            ) : null}
            <WinButton label={`Close ${title}`} onClick={() => close(id)} danger>
              ✕
            </WinButton>
          </div>
        </header>

        {!state?.minimised ? (
          <div className={tone === 'crt' ? 'crt crt-flicker' : ''}>{children}</div>
        ) : null}
      </section>
    </>
  );
}

function WinButton({
  children,
  label,
  onClick,
  danger = false,
  expanded,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      className={`flex w-9 items-center justify-center border-l-2 border-navy text-xs transition-colors sm:w-10 ${
        danger
          ? 'bg-rust text-bone hover:bg-navy hover:text-rust'
          : 'bg-bone text-navy hover:bg-amber'
      }`}
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}

/** Holds the window's place in the flow while it is popped out or closed. */
function FlowGhost({
  id,
  title,
  index,
  muted = false,
}: {
  id: string;
  title: string;
  index: string;
  muted?: boolean;
}) {
  const { restore } = useWindowSystem();

  return (
    <div
      id={muted ? undefined : id}
      className="flex items-center justify-between gap-4 border-2 border-dashed border-bone/45 px-4 py-5"
    >
      <p className="t-label text-bone/70">
        {index} — {title} {muted ? '· popped out' : '· closed'}
      </p>
      {!muted ? (
        <button type="button" onClick={() => restore(id)} className="btn py-1.5 text-[11px]">
          Reopen
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Taskbar() {
  const { windows, order, restore, dock, resetAll } = useWindowSystem();

  const closed = order.filter((id) => windows[id]?.closed);
  const popped = order.filter((id) => windows[id]?.popped);
  const disturbed = closed.length + popped.length;

  if (disturbed === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[400] border-t-2 border-navy bg-bone-dk">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="t-label hidden shrink-0 border-r-2 border-navy pr-3 sm:block">
          Taskbar
        </span>

        {closed.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => restore(id)}
            className="btn py-1 text-[10px] shadow-[2px_2px_0_var(--color-navy)]"
          >
            <span className="text-rust" aria-hidden>
              ●
            </span>
            {windows[id].title}
          </button>
        ))}

        {popped.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => dock(id)}
            className="btn py-1 text-[10px] shadow-[2px_2px_0_var(--color-navy)]"
          >
            <span className="text-amber" aria-hidden>
              ◆
            </span>
            {windows[id].title} — return
          </button>
        ))}

        <button
          type="button"
          onClick={resetAll}
          className="btn btn-primary ml-auto py-1 text-[10px] shadow-[2px_2px_0_var(--color-navy)]"
        >
          Reset all
        </button>
      </div>
    </div>
  );
}

/** Taskbar height plus a window title bar, so controls always stay reachable. */
const TASKBAR_SAFE = 104;

/** Popped windows stack above the diagnostics HUD (300), below the taskbar (400). */
const Z_WINDOW_BASE = 310;
const Z_WINDOW_MAX = 389;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
