'use server';

import { isBackendUnreachable } from '@/lib/supabase/reachability';
import { authClient, supabaseConfigured } from '@/lib/supabase/server';

export type LoginState = { error?: string; redirectTo?: string };

/**
 * Returns a redirect target rather than calling next/navigation's `redirect()`
 * directly. That throws a special error Next is supposed to translate into a
 * client-side navigation for a Server Action invoked through useActionState —
 * in this build it sets the session cookie correctly (verified: valid session,
 * cookie scoped to `/`) but the automatic navigation does not fire, leaving the
 * user stranded on the login page despite being signed in. Returning the
 * target and letting the client call router.push() sidesteps that entirely.
 */
export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!supabaseConfigured) {
    return { error: 'Supabase is not configured on this deployment.' };
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  if (!email || !password) {
    return { error: 'Enter both an email and a password.' };
  }

  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // An unreachable or broken auth service is not a wrong password, and saying
    // so sent the operator hunting for a typo during an outage where the host
    // did not resolve at all. Anything that is not a straight rejection by the
    // auth API — a network failure, a 5xx, a suspended project — says so.
    if (isBackendUnreachable(error)) {
      console.error('[login] auth backend unreachable:', error);
      return {
        error: 'Can’t reach the authentication service — the database may be down. Your password is fine.',
      };
    }
    // Deliberately generic — never confirms whether the email exists.
    return { error: 'Incorrect email or password.' };
  }

  // A path outside /admin would let a crafted `next` value redirect off-portal.
  return { redirectTo: next.startsWith('/admin') ? next : '/admin' };
}

/** Same reasoning as signIn: signal the caller, let the client navigate. */
export async function signOut() {
  if (!supabaseConfigured) return;
  const supabase = await authClient();
  await supabase.auth.signOut();
}
