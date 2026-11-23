/**
 * Ships every design's original file with the site, byte for byte, and makes
 * the gallery's grid copies from it.
 *
 * The gallery opens each design at its original: the file exactly as it was
 * uploaded, never re-encoded. They're served from the deployment (Vercel), not
 * from Supabase Storage, whose small bandwidth allowance the gallery once
 * exhausted. They load only when someone opens a design.
 *
 * Outputs:
 *   public/work/originals/<slug>.<ext>   the uploaded file, untouched
 *   public/work/designs/<slug>.webp      grid copy: up to 2000px wide, quality 92,
 *                                        made from the original (rebuilt only when
 *                                        the original is new or --copies is given)
 *   src/content/originals.json           { slug: { src, bytes, width, height } }
 *
 * Safety: it never deletes, and a failed download leaves the old file in place.
 *
 * Usage:
 *   node scripts/pull-originals.mjs            # fetch what's missing or changed
 *   node scripts/pull-originals.mjs --copies   # also rebuild every grid copy
 */
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const ORIGINALS = path.join(ROOT, 'public/work/originals');
const COPIES = path.join(ROOT, 'public/work/designs');
const MANIFEST = path.join(ROOT, 'src/content/originals.json');
/** The grid copy: wide enough for a retina screen at any size the grid shows it. */
const COPY_WIDTH = 2000;
const COPY_QUALITY = 92;

const rebuildAll = process.argv.includes('--copies');

/** Large files over a slow link time out now and then: try again, up to four times. */
async function fetchRetry(target, init, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(target, init);
      if (r.ok || r.status < 500 || i === tries) return init?.method === 'HEAD' ? r : { ok: r.ok, status: r.status, buf: r.ok ? Buffer.from(await r.arrayBuffer()) : null };
    } catch (error) {
      if (i === tries) throw error;
    }
    await new Promise((done) => setTimeout(done, 1500 * i));
  }
}

// Plain node doesn't read .env.local (CI passes the same names as secrets).
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)="?([^"]*)"?$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Supabase URL and key are needed (.env.local or the environment).');

const res = await fetch(`${url}/rest/v1/designs?select=slug,image_path&published=eq.true&order=sort_order`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) throw new Error(`Could not read the designs: ${res.status}`);
const rows = (await res.json()).filter((r) => r.image_path);

mkdirSync(ORIGINALS, { recursive: true });
mkdirSync(COPIES, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
let fetched = 0, copied = 0, bytes = 0;

for (const row of rows) {
  const ext = path.extname(row.image_path).toLowerCase() || '.png';
  const file = path.join(ORIGINALS, `${row.slug}${ext}`);
  const remote = `${url}/storage/v1/object/public/work/${row.image_path}`;

  // Fetch when missing, or when Storage holds a different file (a re-upload).
  const head = await fetchRetry(remote, { method: 'HEAD' });
  if (!head.ok) {
    console.warn(`skip ${row.slug}: original not reachable (${head.status})`);
    continue;
  }
  const size = Number(head.headers.get('content-length') ?? 0);
  const isNew = !existsSync(file) || (size && statSync(file).size !== size);
  if (isNew) {
    const body = await fetchRetry(remote);
    if (!body.ok || !body.buf) {
      console.warn(`skip ${row.slug}: download failed (${body.status})`);
      continue;
    }
    const buf = body.buf;
    writeFileSync(`${file}.part`, buf);
    renameSync(`${file}.part`, file);
    fetched++;
  }

  const meta = await sharp(file).metadata();
  const stat = statSync(file);
  bytes += stat.size;
  manifest[row.slug] = { src: `/work/originals/${row.slug}${ext}`, bytes: stat.size, width: meta.width, height: meta.height };

  const copy = path.join(COPIES, `${row.slug}.webp`);
  if (isNew || rebuildAll || !existsSync(copy)) {
    await sharp(file)
      .resize({ width: Math.min(COPY_WIDTH, meta.width ?? COPY_WIDTH), withoutEnlargement: true })
      .webp({ quality: COPY_QUALITY, effort: 6, smartSubsample: true })
      .toFile(`${copy}.part`);
    renameSync(`${copy}.part`, copy);
    copied++;
  }
  console.log(`${row.slug.padEnd(40)} ${(stat.size / 1e6).toFixed(1).padStart(5)} MB  ${meta.width}×${meta.height}${isNew ? '  (fetched)' : ''}`);
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\n${rows.length} designs, ${(bytes / 1e6).toFixed(1)} MB of originals; ${fetched} fetched, ${copied} grid copies made`);
