import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './server';

/**
 * The one admin account's UID, also hardcoded into every RLS policy in
 * supabase/migrations (see 0002/0004/0006) — there is exactly one legitimate
 * admin for this single-operator portfolio CMS, so a literal comparison is
 * the same tradeoff already made everywhere else in this project.
 */
export const ADMIN_UID = 'e0600584-39f1-42d6-b4b8-a0080a13de9b';

const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? '';

/**
 * Service-role client — bypasses RLS entirely. Never import this from a
 * 'use client' file or expose SECRET_KEY to the browser; it exists only for
 * trusted server code that must read/write ahead of a real session, such as
 * the face-login comparison (the stored face descriptor has no SELECT policy
 * for any other role — this is the only client that can read it) and issuing
 * a session via admin.generateLink before the user has authenticated.
 */
export function adminClient() {
  return createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let adminEmailPromise: Promise<string | null> | null = null;

/**
 * The admin account's email, resolved from ADMIN_UID once per server instance.
 *
 * Sign-in needs the address to mint a magic-link token, but looking it up is a
 * remote Auth API call on a value that never changes. Memoising keeps the UID
 * as the single source of truth — rather than hardcoding an address in a
 * second place — while costing that round trip only on a cold instance.
 */
export function adminEmail() {
  adminEmailPromise ??= adminClient()
    .auth.admin.getUserById(ADMIN_UID)
    .then((result) => {
      const email = result.data.user?.email ?? null;
      // Only a real answer is worth keeping. Caching a transient failure would
      // disable Face ID on this instance until it restarts.
      if (!email) adminEmailPromise = null;
      return email;
    })
    .catch(() => {
      adminEmailPromise = null;
      return null;
    });
  return adminEmailPromise;
}
