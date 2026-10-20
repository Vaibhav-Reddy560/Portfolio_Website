import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Defined in ./shared so the browser client can read them too; re-exported
// here because everything server-side already imports them from this module.
export { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from './shared';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from './shared';

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
