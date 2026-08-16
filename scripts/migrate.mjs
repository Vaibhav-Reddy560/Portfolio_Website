/**
 * Applies every SQL file in supabase/migrations in filename order.
 *
 * Uses the non-pooling connection because pooled connections (pgbouncer in
 * transaction mode) reject the multi-statement DDL and DO blocks these
 * migrations rely on.
 *
 * Usage: node scripts/migrate.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// Plain node doesn't read .env.local — only Next.js does.
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] ??= m[2];
}

const rawConnectionString =
  process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!rawConnectionString) throw new Error('No Postgres connection string in .env.local');

/**
 * Strip `sslmode` from the URL. node-postgres parses it out of the connection
 * string and builds its own TLS config from it, which then overrides the `ssl`
 * option below — and Supabase presents a chain node won't verify by default,
 * so the connection dies with SELF_SIGNED_CERT_IN_CHAIN. Removing the param
 * lets the explicit `ssl` object win. The connection is still encrypted.
 */
const url = new URL(rawConnectionString);
url.searchParams.delete('sslmode');
const connectionString = url.toString();

const dir = path.join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query(`
    create table if not exists public._migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows } = await client.query('select name from public._migrations');
  const done = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (done.has(file)) {
      console.log(`skip   ${file} (already applied)`);
      continue;
    }
    process.stdout.write(`apply  ${file} ... `);
    const sql = readFileSync(path.join(dir, file), 'utf8');
    // Each migration runs in its own transaction so a failure rolls back whole.
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into public._migrations (name) values ($1)', [file]);
      await client.query('commit');
      console.log('ok');
    } catch (error) {
      await client.query('rollback');
      console.log('FAILED');
      throw error;
    }
  }
  console.log('\nAll migrations applied.');
} finally {
  await client.end();
}
