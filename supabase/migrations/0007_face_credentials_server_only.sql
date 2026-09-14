-- Makes face_credentials reachable only by trusted server code, never by any
-- client-facing role, and fixes enrollment having been impossible.
--
-- 0006 gave this table admin-scoped INSERT/UPDATE/DELETE policies but
-- deliberately no SELECT policy, so the stored descriptor could never be read
-- back by a browser. That combination doesn't work: in Postgres, UPDATE and
-- DELETE have to locate the existing row first, and with no SELECT policy they
-- match nothing. The result was silent — PostgREST returned 204/success with
-- zero rows affected. Enrollment's upsert failed outright (an upsert is
-- INSERT ... ON CONFLICT DO UPDATE, and the UPDATE arm needs SELECT), so
-- Face ID could never be set up at all, and "Remove Face ID" quietly did
-- nothing. Only a plain INSERT into an empty table ever worked.
--
-- Rather than add a SELECT policy and weaken the one property worth keeping
-- here, enrollment now writes through the service-role client behind an
-- explicit admin check in the server action (see
-- src/app/admin/(protected)/security/actions.ts). So these policies have no
-- caller left, and dropping them is a strict improvement: a stolen admin
-- session can no longer plant a face descriptor, which would otherwise be a
-- permanent way back in long after the session itself expired. A face
-- descriptor can't be rotated the way a password can.
--
-- The table keeps RLS enabled with zero policies, so it denies every role
-- that isn't the service role — the same shape as face_login_attempts and
-- public._migrations.

drop policy if exists "admin inserts" on public.face_credentials;
drop policy if exists "admin updates" on public.face_credentials;
drop policy if exists "admin deletes" on public.face_credentials;
