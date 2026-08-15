/**
 * One-shot asset pipeline for the design gallery.
 *
 * Renders every page of the source design PDF, trims the page margin down to the
 * artwork, converts to webp, and emits a manifest with real dimensions plus a tiny
 * inline blur placeholder so the masonry never shifts while images load.
 *
 * Usage:  node scripts/build-assets.mjs "/path/to/All Designs.pdf"
 * Requires poppler (`brew install poppler`) for pdftoppm.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const SRC_PDF = process.argv[2] ?? path.join(os.homedir(), 'Downloads', 'All Designs.pdf');
const OUT_DIR = path.join(process.cwd(), 'public', 'work', 'designs');
const MANIFEST = path.join(process.cwd(), 'src', 'content', 'designs.generated.json');

/** Page order in the source PDF -> stable slug used by the gallery manifest. */
const SLUGS = [
  'easy-club-launch',
  'utsav-certificate',
  'utsav-inauguration-lineup',
  'ieee-cs-bc-student-chairs-meetup',
  'utsav-dj-night',
  'utsav-flashmob',
  'utsav-moto-show',
  'tech-for-good-summit',
  'trial-by-combat',
  'facultys-got-talent',
  'utsav-vc-meet',
  'agentic-ai-unpacked',
  'data-heist',
  'hackaphasia-volunteer-badge',
  'hardware-hackathon-exec-badge',
  'holoverse-360',
  'ieee-cs-2026-identity',
  'out-campus-campaigning',
  'open-source-week-lockup',
  'phaseshift-meridian-core-badge',
  'repogenesis',
  'wattweb',
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designs-'));

console.log('Rendering PDF pages...');
execFileSync('pdftoppm', ['-jpeg', '-r', '200', SRC_PDF, path.join(tmp, 'p')], {
  stdio: 'inherit',
});

const pages = fs
  .readdirSync(tmp)
  .filter((f) => f.endsWith('.jpg'))
  .sort();

fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = [];

for (const [i, file] of pages.entries()) {
  const slug = SLUGS[i] ?? `design-${String(i + 1).padStart(2, '0')}`;

  // The PDF letterboxes each artwork in a white page; trim back to the art itself.
  const trimmed = await sharp(path.join(tmp, file))
    .trim({ threshold: 12 })
    .toBuffer()
    .catch(() => sharp(path.join(tmp, file)).toBuffer());

  const out = path.join(OUT_DIR, `${slug}.webp`);
  const { width, height } = await sharp(trimmed)
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);

  const blur = await sharp(trimmed)
    .resize(16, null, { fit: 'inside' })
    .webp({ quality: 40 })
    .toBuffer();

  manifest.push({
    slug,
    src: `/work/designs/${slug}.webp`,
    width,
    height,
    blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`,
  });

  console.log(`  ${slug}  ${width}x${height}`);
}

fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\nWrote ${manifest.length} images -> ${path.relative(process.cwd(), MANIFEST)}`);
