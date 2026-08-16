'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { signIn, type LoginState } from './actions';

const initialState: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.redirectTo) return;
    // router.refresh() re-runs the (protected) layout's server-side auth
    // check with the now-valid session, rather than serving a stale RSC
    // payload that still thinks the visitor is signed out.
    router.push(state.redirectTo);
    router.refresh();
  }, [state.redirectTo, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <label className="block">
        <span className="t-label crt-text text-phosphor">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          autoFocus
          className="crt-text mt-1.5 w-full border border-phosphor/30 bg-crt px-3 py-2 text-sm text-phosphor outline-none focus-visible:border-phosphor"
        />
      </label>

      <label className="block">
        <span className="t-label crt-text text-phosphor">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="crt-text mt-1.5 w-full border border-phosphor/30 bg-crt px-3 py-2 text-sm text-phosphor outline-none focus-visible:border-phosphor"
        />
      </label>

      {state.error ? (
        <p role="alert" className="t-data text-[11px] uppercase tracking-[0.1em] text-rust">
          ⚠ {state.error}
        </p>
      ) : null}

      {/* relative + a z-index above the CRT screen's scanline/bloom pseudo-elements
          (.crt::after has no z-index so it stacks at the "auto" level; .crt::before
          is z-index:1) keeps this button on the same screen — just painted above
          the overlay instead of under it, rather than moving it off the screen. */}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary relative z-10 w-full"
      >
        {pending ? 'Authenticating…' : 'Sign in'}
      </button>
    </form>
  );
}
