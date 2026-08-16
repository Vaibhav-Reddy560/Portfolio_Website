-- Scopes every write policy to the specific admin account rather than the
-- whole `authenticated` role.
--
-- Supabase projects allow public email/password sign-up by default
-- (disable_signup: false), which this project has not overridden. The
-- original policies from 0001 granted `to authenticated using (true)` — full
-- read/write to any signed-in session, regardless of who signed up. Since
-- self-serve sign-up is on, anyone could register an account and get a valid
-- "authenticated" JWT, which the original policies could not tell apart from
-- the real admin. `TO authenticated` alone is authentication without
-- authorization; this migration adds the missing authorization check.
--
-- The UID is hardcoded rather than resolved via a subquery against
-- auth.users on every row check: there is exactly one legitimate admin for
-- this single-operator portfolio CMS, so a literal comparison is cheaper,
-- clearer about intent, and cannot be tricked by a users-table race. If the
-- admin account is ever recreated with a new UID, this migration's constant
-- needs updating to match.
do $$
declare
  admin_uid constant uuid := 'e0600584-39f1-42d6-b4b8-a0080a13de9b';
  t text;
begin
  foreach t in array array[
    'designs','projects','experience','skill_groups','education','profile'
  ] loop
    execute format('drop policy if exists "authenticated writes" on public.%I;', t);
    execute format(
      $f$create policy "admin writes" on public.%I
         for all to authenticated
         using ((select auth.uid()) = %L::uuid)
         with check ((select auth.uid()) = %L::uuid);$f$,
      t, admin_uid, admin_uid
    );
  end loop;
end $$;

-- Same tightening for storage: only the admin can write into the `work`
-- bucket. Public read stays open — the gallery images are meant to be public.
drop policy if exists "work authed insert" on storage.objects;
drop policy if exists "work authed update" on storage.objects;
drop policy if exists "work authed delete" on storage.objects;

do $$
declare
  admin_uid constant uuid := 'e0600584-39f1-42d6-b4b8-a0080a13de9b';
begin
  execute format(
    $f$create policy "work admin insert" on storage.objects
       for insert to authenticated
       with check (bucket_id = 'work' and (select auth.uid()) = %L::uuid);$f$,
    admin_uid
  );
  execute format(
    $f$create policy "work admin update" on storage.objects
       for update to authenticated
       using (bucket_id = 'work' and (select auth.uid()) = %L::uuid)
       with check (bucket_id = 'work' and (select auth.uid()) = %L::uuid);$f$,
    admin_uid, admin_uid
  );
  execute format(
    $f$create policy "work admin delete" on storage.objects
       for delete to authenticated
       using (bucket_id = 'work' and (select auth.uid()) = %L::uuid);$f$,
    admin_uid
  );
end $$;
