'use server';

import { authClient, supabaseConfigured } from '@/lib/supabase/server';
import { adminClient, adminEmail } from '@/lib/supabase/admin';
import { FACE_DESCRIPTOR_LENGTH, FACE_MATCH_AGREEMENT, FACE_MATCH_THRESHOLD } from '@/lib/face/constants';
import type { LoginState } from './actions';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function isValidDescriptor(descriptor: unknown): descriptor is number[] {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === FACE_DESCRIPTOR_LENGTH &&
    descriptor.every((value) => typeof value === 'number' && Number.isFinite(value))
  );
}

function euclideanDistance(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/**
 * Scores the captured frames against the enrolled model.
 *
 * Each frame is matched independently against its own nearest enrolled view,
 * and a majority of frames must agree before sign-in is allowed. The previous
 * version returned the single smallest distance across every frame-and-view
 * pair, which let a different person in: with 20 enrolled views and 3 captured
 * frames that was 60 independent chances for one of them to fall under the
 * threshold, and only one had to.
 */
function scoreCapture(captured: number[][], enrolled: number[][]) {
  const perFrame = captured.map((candidate) =>
    Math.min(...enrolled.map((reference) => euclideanDistance(candidate, reference))),
  );
  const matching = perFrame.filter((distance) => distance <= FACE_MATCH_THRESHOLD).length;
  const required = Math.max(1, Math.ceil(captured.length * FACE_MATCH_AGREEMENT));

  return {
    accepted: matching >= required,
    matching,
    required,
    best: Math.min(...perFrame),
    perFrame,
  };
}

async function recordFailure(admin: ReturnType<typeof adminClient>, currentFailedCount: number) {
  const failedCount = currentFailedCount + 1;
  const lockedUntil =
    failedCount >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null;
  await admin
    .from('face_login_attempts')
    .upsert({ id: true, failed_count: failedCount, locked_until: lockedUntil });
}

/**
 * Face ID sign-in. Never touches the password path — face_descriptors has no
 * policy for any client-facing role (migrations 0007/0008), so only this
 * service-role client can read the enrolled views, and matching happens
 * entirely here, server-side. They never reach a browser.
 *
 * Session issuance mirrors how signInWithPassword already works: both go
 * through authClient(), the same cookie-bound `@supabase/ssr` client, so the
 * resulting session cookie is indistinguishable from a password login's.
 * admin.generateLink + verifyOtp(token_hash) is the standard Supabase
 * pattern for establishing a session from a non-password verification —
 * confirmed against @supabase/auth-js's own type definitions.
 */
export async function signInWithFace(
  descriptors: unknown,
  next: string = '/admin',
): Promise<LoginState> {
  if (!supabaseConfigured) {
    return { error: 'Supabase is not configured on this deployment.' };
  }
  if (
    !Array.isArray(descriptors) ||
    descriptors.length === 0 ||
    !descriptors.every(isValidDescriptor)
  ) {
    return { error: 'Invalid face data captured — please try again.' };
  }
  const captured = descriptors as number[][];

  const admin = adminClient();

  // Independent reads, and the email is memoised after the first sign-in on
  // this instance — so this is one round trip rather than three serial ones.
  const [{ data: attempts }, { data: enrolled }, email] = await Promise.all([
    admin.from('face_login_attempts').select('failed_count, locked_until').eq('id', true).maybeSingle(),
    admin.from('face_descriptors').select('descriptor'),
    adminEmail(),
  ]);

  if (attempts?.locked_until && new Date(attempts.locked_until) > new Date()) {
    return { error: 'Too many failed attempts. Use your password, or try Face ID again later.' };
  }

  if (!enrolled || enrolled.length === 0) {
    return { error: 'Face ID isn’t set up yet. Sign in with your password.' };
  }

  const score = scoreCapture(
    captured,
    enrolled.map((row) => row.descriptor as number[]),
  );

  // Server-side only: the actual numbers, so tuning is done from real
  // attempts rather than guesswork. Deliberately not returned to the client —
  // this endpoint is reachable before authentication, and handing back how
  // close a face got is exactly what someone probing it would want.
  console.info(
    `[face-login] ${score.accepted ? 'accept' : 'reject'} ` +
      `best=${score.best.toFixed(3)} threshold=${FACE_MATCH_THRESHOLD} ` +
      `matched=${score.matching}/${captured.length} (need ${score.required}) ` +
      `frames=[${score.perFrame.map((d) => d.toFixed(3)).join(', ')}] ` +
      `views=${enrolled.length}`,
  );

  if (!score.accepted) {
    await recordFailure(admin, attempts?.failed_count ?? 0);
    return { error: 'Face not recognized.' };
  }

  if (!email) {
    return { error: 'Could not sign in with Face ID right now.' };
  }

  // Not awaited: resetting the failure counter is bookkeeping, and making the
  // sign-in wait on it just adds a round trip to the critical path.
  void admin.from('face_login_attempts').upsert({ id: true, failed_count: 0, locked_until: null });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError) {
    return { error: 'Could not sign in with Face ID right now.' };
  }

  const supabase = await authClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (verifyError) {
    return { error: 'Could not sign in with Face ID right now.' };
  }

  return { redirectTo: next.startsWith('/admin') ? next : '/admin' };
}
