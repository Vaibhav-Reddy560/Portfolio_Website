'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { FaceCamera } from '@/components/face-camera';
import { isCameraSupported } from '@/lib/face/support';
import { signIn } from './actions';
import { signInWithFace } from './face-actions';

/**
 * A plain `onSubmit` handler calling the Server Action directly, not
 * `<form action={signIn}>` bound through `useActionState`. React 19's
 * `<form action={fn}>` path calls `requestFormReset` unconditionally before
 * the action runs — on every submission, success or failure — which is
 * exactly why a mistyped password used to wipe both fields: nothing else in
 * this file was clearing them. `onSubmit` + `preventDefault` never triggers
 * that reset, so a failed attempt only ever shows the error message.
 *
 * The redirect (on success) and the sign-in call both live in the same
 * `startTransition`, so `pending` stays true for the whole round trip —
 * previously the button reverted to idle the moment the action returned,
 * then a separate effect fired the navigation a beat later, which read as a
 * stall.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [faceMode, setFaceMode] = useState(false);
  // Feature detection is client-only (the server has no `navigator.mediaDevices`
  // at all, so unconditionally reading it in render would mismatch hydration
  // the moment a real browser supports the camera API).
  const [cameraSupported, setCameraSupported] = useState(false);
  useEffect(() => setCameraSupported(isCameraSupported()), []);

  const onResult = (result: { error?: string; redirectTo?: string }) => {
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.redirectTo) {
      router.push(result.redirectTo);
      // The visitor may have already bounced off /admin once while signed
      // out (redirected to this page); router.refresh() forces that route
      // to re-render with the now-valid session instead of serving a
      // stale client-cached "signed out" payload for it.
      router.refresh();
    }
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      onResult(await signIn({}, formData));
    });
  };

  const onFaceCapture = (descriptor: number[]) => {
    setFaceMode(false);
    setError(null);
    startTransition(async () => {
      onResult(await signInWithFace(descriptor, next));
    });
  };

  if (faceMode) {
    return (
      <div className="space-y-4">
        <FaceCamera mode="login" onCapture={onFaceCapture} onCancel={() => setFaceMode(false)} />
        {error ? (
          <p role="alert" className="t-data text-[11px] uppercase tracking-[0.1em] text-rust">
            ⚠ {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className="t-label crt-text relative z-10 text-phosphor/70">Email</span>
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
          <span className="t-label crt-text relative z-10 text-phosphor/70">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="crt-text mt-1.5 w-full border border-phosphor/30 bg-crt px-3 py-2 text-sm text-phosphor outline-none focus-visible:border-phosphor"
          />
        </label>

        {error ? (
          <p role="alert" className="t-data text-[11px] uppercase tracking-[0.1em] text-rust">
            ⚠ {error}
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

      {cameraSupported ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setFaceMode(true);
          }}
          className="btn relative z-10 w-full py-1.5 text-[11px]"
        >
          Sign in with Face ID
        </button>
      ) : null}
    </div>
  );
}
