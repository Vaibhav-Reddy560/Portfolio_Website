import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True only when the environment is wired up; loaders fall back when false. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Anonymous read-only client for public pages.
 *
 * No cookies, so it stays compatible with static rendering — public pages are
 * prerendered and must not opt into dynamic rendering just by reading content.
 */
export function readClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cookie-bound client for authenticated (admin) requests, so RLS sees the
 * logged-in user rather than the anon role.
 */
export async function authClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // session refresh still happens in the proxy, so this is safe to skip.
        }
      },
    },
  });
}

/** Returns the signed-in user, or null. Used to gate every admin route. */
export async function getAdminUser() {
  if (!supabaseConfigured) return null;
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
