-- Face ID login: a face descriptor (128 floats, never a photo) for the one
-- admin account, plus a small lockout counter for the face-login attempt.
--
-- Both tables are readable by nobody through the Data API — no SELECT policy
-- is created for either `anon` or `authenticated`, the same pattern already
-- used for `public._migrations`. The only code path that ever reads
-- `face_credentials.descriptor` or `face_login_attempts` is a trusted
-- service-role server action (see src/lib/supabase/admin.ts), which bypasses
-- RLS entirely by design. This means the reference descriptor a face-login
-- attempt is compared against can never reach any browser, including the
-- admin's own.
--
-- `face_credentials` still gets admin-scoped INSERT/UPDATE/DELETE policies
-- (the same `auth.uid() = admin_uid` predicate every other table in this
-- project uses) so the enrollment flow can write to it as the logged-in
-- admin, exactly like `profile` and every other single-row table here.
-- `face_login_attempts` gets no policies for authenticated/anon at all — it
-- is only ever touched pre-auth by the service-role client.

create table if not exists public.face_credentials (
  id           boolean primary key default true,
  descriptor   real[] not null,
  enrolled_at  timestamptz not null default now(),
  constraint face_credentials_is_singleton check (id),
  constraint face_credentials_descriptor_length check (array_length(descriptor, 1) = 128)
);

create table if not exists public.face_login_attempts (
  id            boolean primary key default true,
  failed_count  int not null default 0,
  locked_until  timestamptz,
  constraint face_login_attempts_is_singleton check (id)
);

alter table public.face_credentials enable row level security;
alter table public.face_login_attempts enable row level security;

do $$
declare
  admin_uid constant uuid := 'e0600584-39f1-42d6-b4b8-a0080a13de9b';
begin
  execute format(
    $f$create policy "admin inserts" on public.face_credentials
       for insert to authenticated
       with check ((select auth.uid()) = %L::uuid);$f$,
    admin_uid
  );
  execute format(
    $f$create policy "admin updates" on public.face_credentials
       for update to authenticated
       using ((select auth.uid()) = %L::uuid)
       with check ((select auth.uid()) = %L::uuid);$f$,
    admin_uid, admin_uid
  );
  execute format(
    $f$create policy "admin deletes" on public.face_credentials
       for delete to authenticated
       using ((select auth.uid()) = %L::uuid);$f$,
    admin_uid
  );
end $$;
