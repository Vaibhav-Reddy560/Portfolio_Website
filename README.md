# Vaibhav Reddy — Portfolio

Retro-futurist "Control Panel": bone machine housing on a blueprint ground, with
amber CRT screens inset. Next.js 16 + TypeScript + Tailwind v4 + Motion.

## Develop

```bash
npm run dev      # http://localhost:3000
npm run build
```

## Type system

Three faces, with fixed roles:

| Role | Face | Where |
|---|---|---|
| Name only | **Octavus Black** | `.t-name` — the hero name, nowhere else |
| Headlines | **YFF Rare Trial Power Black** | `.t-head` — window + section titles |
| Everything else | **Jura** | `.t-label`, `.t-data`, body copy |

Loaded via `next/font/local` in `src/app/fonts.ts` from the files in `public/`.

Octavus is unusually wide — "VAIBHAV" measures **9.758em** and "REDDY"
**7.430em**. The hero clamp in `src/components/identity.tsx` is derived from
that measurement rather than guessed. Both lines are set at their natural
width; they are deliberately *not* forced to match. If you change the name,
re-measure before adjusting the clamp.

## Adding your images

Every gallery cell is a **slot**. Slots without an image render a designed CRT
"NO SIGNAL" placeholder showing the exact filename expected — so an unfilled
gallery still looks deliberate.

To fill one:

1. Save the image as `public/work/designs/<slug>.webp`
2. In `src/content/work.ts`, add `src` to that entry:

```ts
{ slug: 'utsav-dj-night', title: 'DJ Night', …, ratio: 0.8,
  src: '/work/designs/utsav-dj-night.webp',
  alt: 'Describe the poster for screen readers.' }
```

`ratio` is width ÷ height and drives the slot's shape — set it to match your
image so the layout never shifts.

Two product slots live outside the gallery, wired in `ProductSlot` inside
`src/components/case-studies.tsx`, currently filled:

- `/work/easy-club/product.webp`
- `/work/opacitys/product.webp`

To replace either, overwrite the file at the same path and dimensions stay
consistent automatically. Drop the `src` prop on that `<ProductSlot>` call to
go back to the "NO SIGNAL" placeholder instead.

## Portrait

`public/portrait-amber.webp` is generated, not hand-edited:

```bash
node scripts/build-portrait.mjs        # reads public/image-1.png
```

It crops to head-and-shoulders, reduces to luminance, and re-screens the result
as a rotated amber halftone. That removes the green foliage by construction
rather than by masking, and because the output is two colours it compresses
losslessly to ~32 KB — about a fifth of a lossy continuous-tone version, with no
colour fringing. Replace `public/image-1.png` and re-run to update it.

`public/image-1.png` is only the 7 MB source for that script — nothing loads it
at runtime. Move it out of `public/` if you would rather not ship it.

Batch-converting a PDF or folder? `node scripts/build-assets.mjs "<file.pdf>"`
renders, trims and converts to webp. Needs `brew install poppler`.

The 22 posters extracted from your original PDF are archived at
`public/work/extracted/` — nothing was thrown away.

## Window system

Every section is a window (`src/components/window-system.tsx`):

- **Drag** a title bar (desktop, ≥1024px + fine pointer) to pop it out of the
  flow; a dashed ghost holds its place and `⤓` returns it
- **`▁`** minimises in place, **`✕`** closes to the taskbar
- **Reset all** in the taskbar restores everything

Dragging is a pointer-only enhancement — content stays in DOM order, all
controls are real buttons, and nothing is reachable only by dragging. Below
1024px the chrome renders without drag.

Stacking order is deliberate: diagnostics HUD `300`, popped windows `310–389`,
taskbar `400`, boot `900`. `.shell` must **not** get a `z-index`, or it forms a
stacking context that traps windows beneath the HUD.

## Boot sequence & diagnostics

- `boot-sequence.tsx` — runs once per session (`sessionStorage`), skippable by
  any key or click, skipped entirely under `prefers-reduced-motion`
- `diagnostics.tsx` — live telemetry read from the DOM: active module, scroll
  depth, pointer position, viewport, and an oscilloscope driven by real scroll
  velocity. Draggable on desktop, collapsed by default on mobile.

## Content

All copy is in `src/content/` — `profile.ts`, `experience.ts`, `skills.ts`,
`work.ts`. Components never hold text.
