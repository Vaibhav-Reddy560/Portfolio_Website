-- Fixes two findings from `supabase db advisors --type security`.

-- ERROR: rls_disabled_in_public — _migrations is an internal ledger for
-- scripts/migrate.mjs (which migration files have run) and has no business
-- being reachable through the public Data API. Enabling RLS with zero
-- policies blocks anon/authenticated entirely; the migration script itself
-- connects directly over Postgres as the table owner, which is unaffected.
alter table public._migrations enable row level security;

-- WARN: function_search_path_mutable — an unqualified search_path lets any
-- role that can create objects earlier in the effective path shadow what the
-- function resolves at call time. touch_updated_at() only touches `new` and
-- the built-in now(), so today's exploitability is near zero, but pinning the
-- path is the standard, cost-free remediation rather than leaving it mutable.
alter function public.touch_updated_at() set search_path = '';
