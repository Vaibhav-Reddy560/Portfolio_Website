/**
 * Pulls the live content back into the repo, so the offline copy is never
 * stale.
 *
 * Every loader is `database ?? static file` (src/lib/content.ts), and the
 * static file is also what the gallery serves its images from. That copy has
 * only ever been updated by hand, so twice now a database outage has left the
 * public site showing weeks-old work with no sign anything was missing. This
 * script closes that gap: it reads the published rows, writes them into
 * src/content/work.ts, and downloads a web-sized webp for any piece the repo
 * does not already have.
 *
 * Safety: it refuses to write anything unless it fetched a plausible, complete
 * set. A failed request, an empty table or a suspiciously large deletion
 * leaves the repo exactly as it was — the fallback must never be emptied by
 * the very outage it exists for.
 *
 * Usage:
 *   node scripts/sync-fallback.mjs             # sync into this working tree
 *   node scripts/sync-fallback.mjs --dry-run   # report, change nothing
 *   node scripts/sync-fallback.mjs --root DIR  # work against another tree (tests)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const rootArg = args.indexOf('--root');
const ROOT = rootArg === -1 ? process.cwd() : path.resolve(args[rootArg + 1]);

const WORK_TS = path.join(ROOT, 'src/content/work.ts');
const DESIGN_DIR = path.join(ROOT, 'public/work/designs');
/** Matches scripts/build-assets.mjs, so synced and hand-built art are alike. */
const IMAGE_WIDTH = 1400;
const IMAGE_QUALITY = 82;
/** A sync that would drop more than this share of the gallery is treated as wrong. */
const MAX_DELETION_SHARE = 0.34;

function loadEnv() {
  const file = path.join(ROOT, '.env.local');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^([A-Z_0-9]+)="?([^"]*)"?$/);
      if (match) process.env[match[1]] ??= match[2];
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }
  return { url: url.replace(/\/$/, ''), key };
}

async function fetchRows({ url, key }, table, columns) {
  const endpoint = `${url}/rest/v1/${table}?select=${columns}&published=eq.true&order=sort_order.asc`;
  const response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) {
    // 402 is the one worth naming: the project is restricted for exceeding its
    // quota, and every endpoint returns it, so "not found" would mislead.
    const hint = response.status === 402 ? ' (project restricted — quota exceeded)' : '';
    throw new Error(`${table}: HTTP ${response.status}${hint} ${(await response.text()).slice(0, 160)}`);
  }
  return response.json();
}

/** A TypeScript string literal, single-quoted unless the value contains one. */
function literal(value) {
  const text = String(value ?? '');
  return text.includes("'") ? JSON.stringify(text) : `'${text.replace(/\\/g, '\\\\')}'`;
}

function renderDesigns(rows) {
  return rows
    .map((row) => {
      const ratio = Number(row.ratio);
      const fields = [
        `slug: ${literal(row.slug)}`,
        `title: ${literal(row.title)}`,
        `context: ${literal(row.context)}`,
        `kind: ${literal(row.kind)}`,
        `year: ${literal(row.year)}`,
        `ratio: ${Number.isFinite(ratio) ? Math.round(ratio * 1000) / 1000 : 1}`,
        `src: '/work/designs/${row.slug}.webp'`,
      ];
      if (row.alt) fields.push(`alt: ${literal(row.alt)}`);
      return `  { ${fields.join(', ')} },`;
    })
    .join('\n');
}

function renderBuilds(rows) {
  return rows
    .map((row) => {
      const lines = [
        `    slug: ${literal(row.slug)},`,
        `    title: ${literal(row.name)},`,
        `    tagline: ${literal(row.tagline ?? '')},`,
        `    year: ${literal(row.year ?? '')},`,
      ];
      if (row.href) lines.push(`    href: ${literal(row.href)},`);
      if (row.href_label) lines.push(`    hrefLabel: ${literal(row.href_label)},`);
      const stack = (row.stack ?? []).map((item) => literal(item)).join(', ');
      lines.push(`    stack: [${stack}],`);
      lines.push(`    summary:\n      ${literal(row.summary ?? '')},`);
      return `  {\n${lines.join('\n')}\n  },`;
    })
    .join('\n');
}

/**
 * Swaps the body of `export const <name> ... = [ … ];`, leaving its comment alone.
 *
 * Anchored on `= [` rather than the first `[` after the declaration: the first
 * one belongs to the type annotation (`DesignPiece[]`), and cutting there
 * silently produced `DesignPiece[` followed by the entries — valid-looking in a
 * diff, and a build error.
 */
function replaceArray(source, declaration, body) {
  const start = source.indexOf(declaration);
  if (start === -1) throw new Error(`could not find "${declaration}" in work.ts`);
  const assignment = source.indexOf('= [', start);
  const close = source.indexOf('\n];', assignment);
  if (assignment === -1 || close === -1) throw new Error(`could not parse "${declaration}"`);
  const open = assignment + 2;
  return `${source.slice(0, open + 1)}\n${body}${source.slice(close)}`;
}

async function syncImage(row, { url }) {
  const target = path.join(DESIGN_DIR, `${row.slug}.webp`);
  if (existsSync(target)) return 'kept';
  if (!row.image_path) return 'no image';
  if (dryRun) return 'would download';

  const source = row.image_path.startsWith('http') || row.image_path.startsWith('/')
    ? row.image_path
    : `${url}/storage/v1/object/public/work/${row.image_path}`;
  // A local path (legacy rows) is already in the repo; nothing to fetch.
  if (source.startsWith('/')) return 'local path';

  const response = await fetch(source);
  if (!response.ok) throw new Error(`${row.slug}: image HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  mkdirSync(DESIGN_DIR, { recursive: true });
  await sharp(bytes)
    .resize({ width: IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: IMAGE_QUALITY })
    .toFile(target);
  return 'downloaded';
}

async function main() {
  const config = loadEnv();
  const [designs, projects] = await Promise.all([
    fetchRows(config, 'designs', 'slug,title,context,kind,year,ratio,image_path,alt,sort_order'),
    fetchRows(config, 'projects', 'slug,name,tagline,year,href,href_label,summary,stack,sort_order'),
  ]);

  if (designs.length === 0 || projects.length === 0) {
    throw new Error('refusing to sync: the database returned no published rows');
  }

  const existing = existsSync(DESIGN_DIR)
    ? readdirSync(DESIGN_DIR).filter((name) => name.endsWith('.webp')).map((name) => name.slice(0, -5))
    : [];
  const live = new Set(designs.map((row) => row.slug));
  const removed = existing.filter((slug) => !live.has(slug));
  if (existing.length && removed.length / existing.length > MAX_DELETION_SHARE) {
    throw new Error(
      `refusing to sync: ${removed.length} of ${existing.length} pieces would be removed — ` +
        'that looks like a partial read rather than a deletion',
    );
  }

  const images = [];
  for (const row of designs) images.push(`${row.slug}: ${await syncImage(row, config)}`);

  let source = readFileSync(WORK_TS, 'utf8');
  source = replaceArray(source, 'export const designs: DesignPiece[]', renderDesigns(designs));
  source = replaceArray(source, 'export const builds: BuildProject[]', renderBuilds(projects));

  if (dryRun) {
    console.log(`[dry run] ${designs.length} designs, ${projects.length} projects`);
    console.log(`[dry run] images: ${images.join(', ')}`);
    console.log(`[dry run] would remove: ${removed.join(', ') || 'nothing'}`);
    console.log(`[dry run] work.ts would ${source === readFileSync(WORK_TS, 'utf8') ? 'not change' : 'change'}`);
    return;
  }

  writeFileSync(WORK_TS, source);
  for (const slug of removed) rmSync(path.join(DESIGN_DIR, `${slug}.webp`), { force: true });

  console.log(`synced ${designs.length} designs, ${projects.length} projects`);
  console.log(`images: ${images.join(', ')}`);
  if (removed.length) console.log(`removed: ${removed.join(', ')}`);
}

main().catch((error) => {
  console.error(`[sync-fallback] ${error.message}`);
  console.error('nothing was changed.');
  process.exit(1);
});
