/**
 * Seeds the database from the static content files that currently drive the
 * site, so the DB-backed site starts byte-identical to the static one.
 *
 * Idempotent: every insert upserts on a natural key, so re-running is safe and
 * will not duplicate rows.
 *
 * Usage: node scripts/seed.mjs
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] ??= m[2];
}

// The content files below are TypeScript. Node 22.18+/25 strips types on import
// natively, so they can be imported directly with no build step or loader.

const url = new URL(process.env.POSTGRES_URL_NON_POOLING);
url.searchParams.delete('sslmode');
const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { designs, builds } = await import('../src/content/work.ts');
const { easyClub, opacitys } = await import('../src/content/case-studies.ts');
const { profile } = await import('../src/content/profile.ts');
const { experience, additionalRoles } = await import('../src/content/experience.ts');
const { skillGroups, education } = await import('../src/content/skills.ts');

try {
  await client.query('begin');

  // ---- designs ----
  for (const [i, d] of designs.entries()) {
    await client.query(
      `insert into public.designs
         (slug, title, context, kind, year, ratio, image_path, alt, published, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (slug) do update set
         title=excluded.title, context=excluded.context, kind=excluded.kind,
         year=excluded.year, ratio=excluded.ratio, sort_order=excluded.sort_order`,
      [d.slug, d.title, d.context, d.kind, d.year, d.ratio,
       d.src ?? null, d.alt ?? null, true, i],
    );
  }
  console.log(`designs        ${designs.length}`);

  // ---- projects ----
  // The two rich case studies carry their extra structure in `detail`; the
  // remaining builds are plain cards.
  const detailFor = (slug) =>
    slug === 'easy-club'
      ? { pillars: easyClub.pillars }
      : slug === 'opacitys'
        ? {
            modules: opacitys.modules,
            providers: opacitys.providers,
            engineering: opacitys.engineering,
          }
        : {};

  const studyFor = (slug) =>
    slug === 'easy-club' ? easyClub : slug === 'opacitys' ? opacitys : null;

  for (const [i, b] of builds.entries()) {
    const study = studyFor(b.slug);
    await client.query(
      `insert into public.projects
         (slug, name, tagline, year, href, href_label, summary, thesis, stack,
          note, image_path, detail, featured, published, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       on conflict (slug) do update set
         name=excluded.name, tagline=excluded.tagline, year=excluded.year,
         href=excluded.href, href_label=excluded.href_label,
         summary=excluded.summary, thesis=excluded.thesis, stack=excluded.stack,
         note=excluded.note, detail=excluded.detail,
         featured=excluded.featured, sort_order=excluded.sort_order`,
      [
        b.slug, b.title, b.tagline, b.year, b.href ?? null, b.hrefLabel ?? null,
        b.summary, study?.thesis ?? null, b.stack, study?.note ?? null,
        b.slug === 'easy-club' ? '/work/easy-club/product.webp'
          : b.slug === 'opacitys' ? '/work/opacitys/product.webp' : null,
        JSON.stringify(detailFor(b.slug)),
        Boolean(study), true, i,
      ],
    );
  }
  console.log(`projects       ${builds.length}`);

  // ---- experience (primary + additional in one table) ----
  await client.query('delete from public.experience');
  for (const r of experience) {
    await client.query(
      `insert into public.experience
         (title, org, sub, start_label, end_label, detail, tags, is_additional, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,false,$8)`,
      [r.title, r.org, r.sub ?? null, r.start, r.end, r.detail, r.tags, r.order],
    );
  }
  for (const [i, r] of additionalRoles.entries()) {
    await client.query(
      `insert into public.experience
         (title, org, is_additional, sort_order)
       values ($1,$2,true,$3)`,
      [r.role, r.org, i],
    );
  }
  console.log(`experience     ${experience.length} + ${additionalRoles.length} additional`);

  // ---- skills ----
  for (const [i, g] of skillGroups.entries()) {
    await client.query(
      `insert into public.skill_groups (group_key, label, discipline, items, sort_order)
       values ($1,$2,$3,$4,$5)
       on conflict (group_key) do update set
         label=excluded.label, discipline=excluded.discipline,
         items=excluded.items, sort_order=excluded.sort_order`,
      [g.id, g.label, g.discipline, g.items, i],
    );
  }
  console.log(`skill_groups   ${skillGroups.length}`);

  // ---- education ----
  await client.query('delete from public.education');
  for (const [i, e] of education.entries()) {
    await client.query(
      `insert into public.education
         (qualification, institution, period, place, is_current, sort_order)
       values ($1,$2,$3,$4,$5,$6)`,
      [e.qualification, e.institution, e.period, e.place, e.current, i],
    );
  }
  console.log(`education      ${education.length}`);

  // ---- profile (singleton) ----
  await client.query(
    `insert into public.profile
       (id, first, last, eyebrow, role, location, status, lede, about,
        facts, contact, interests, portrait_path)
     values (true,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict (id) do update set
       first=excluded.first, last=excluded.last, eyebrow=excluded.eyebrow,
       role=excluded.role, location=excluded.location, status=excluded.status,
       lede=excluded.lede, about=excluded.about, facts=excluded.facts,
       contact=excluded.contact, interests=excluded.interests,
       portrait_path=excluded.portrait_path`,
    [
      profile.first, profile.last, [...profile.eyebrow], profile.role,
      profile.location, profile.status, profile.lede, [...profile.about],
      JSON.stringify(profile.facts), JSON.stringify(profile.contact),
      [...profile.interests], '/portrait-amber.webp',
    ],
  );
  console.log('profile        1');

  await client.query('commit');
  console.log('\nSeed complete.');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
