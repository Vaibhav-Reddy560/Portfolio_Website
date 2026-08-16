'use server';

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
