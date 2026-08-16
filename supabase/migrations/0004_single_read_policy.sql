-- Fixes multiple_permissive_policies (performance advisor): SELECT was
-- covered by two stacked permissive policies for the `authenticated` role —
-- "admin writes" (a `for all` policy, which implicitly includes SELECT) and
-- the public read policy. Postgres evaluates every permissive policy on a
-- query, so each read was paying for two policy checks instead of one.
--
-- The admin dashboard's draft counter depends on the admin being able to see
-- unpublished rows, so the fix isn't simply dropping the redundant SELECT —
-- it's merging "public reads published" and "admin reads everything" into one
-- policy per table, and narrowing "admin writes" to the three actions that
-- actually need it.
do $$
declare
  admin_uid constant uuid := 'e0600584-39f1-42d6-b4b8-a0080a13de9b';
  t text;
begin
  -- Tables gated by `published`: public sees published rows, the admin sees
  -- everything (including drafts), in one policy rather than two.
  foreach t in array array['designs','projects','experience'] loop
    execute format('drop policy if exists "public reads published" on public.%I;', t);
    execute format('drop policy if exists "admin writes" on public.%I;', t);

    execute format(
      $f$create policy "reads" on public.%I
         for select
         using (published = true or (select auth.uid()) = %L::uuid);$f$,
      t, admin_uid
    );
    execute format(
      $f$create policy "admin inserts" on public.%I
         for insert to authenticated
         with check ((select auth.uid()) = %L::uuid);$f$,
      t, admin_uid
    );
    execute format(
      $f$create policy "admin updates" on public.%I
         for update to authenticated
         using ((select auth.uid()) = %L::uuid)
         with check ((select auth.uid()) = %L::uuid);$f$,
      t, admin_uid, admin_uid
    );
    execute format(
      $f$create policy "admin deletes" on public.%I
         for delete to authenticated
         using ((select auth.uid()) = %L::uuid);$f$,
      t, admin_uid
    );
  end loop;

  -- Reference tables have no draft concept — "public reads all" already
  -- covers every role for SELECT, so admin never needed a second one here.
  -- Only the write side needs narrowing off `for all`.
  foreach t in array array['skill_groups','education','profile'] loop
    execute format('drop policy if exists "admin writes" on public.%I;', t);

    execute format(
      $f$create policy "admin inserts" on public.%I
         for insert to authenticated
         with check ((select auth.uid()) = %L::uuid);$f$,
      t, admin_uid
    );
    execute format(
      $f$create policy "admin updates" on public.%I
         for update to authenticated
         using ((select auth.uid()) = %L::uuid)
         with check ((select auth.uid()) = %L::uuid);$f$,
      t, admin_uid, admin_uid
    );
    execute format(
      $f$create policy "admin deletes" on public.%I
         for delete to authenticated
         using ((select auth.uid()) = %L::uuid);$f$,
      t, admin_uid
    );
  end loop;
end $$;
