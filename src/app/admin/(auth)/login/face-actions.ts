'use server';

import { authClient, supabaseConfigured } from '@/lib/supabase/server';
import { ADMIN_UID, adminClient } from '@/lib/supabase/admin';
import { FACE_DESCRIPTOR_LENGTH, FACE_MATCH_THRESHOLD } from '@/lib/face/constants';
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
 * Closest distance between any captured frame and any enrolled view.
 *
 * Enrollment stores a separate descriptor per head position rather than one
 * averaged vector, so this is a nearest-neighbour search over the whole
 * model — the same thing face-api's FaceMatcher does. Taking the minimum is
 * what lets a face enrolled straight-on still match when signing in at a
 * slightly different angle.
 */
function closestDistance(captured: number[][], enrolled: number[][]) {
  let best = Infinity;
  for (const candidate of captured) {
    for (const reference of enrolled) {
      const distance = euclideanDistance(candidate, reference);
      if (distance < best) best = distance;
    }
  }
  return best;
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
 * Face ID sign-in. Never touches the password path — the stored descriptor
 * has no SELECT policy for anyone but this service-role client (see
 * supabase/migrations/0006_face_id.sql), and matching happens entirely here,
 * server-side, so the reference descriptor never reaches a browser.
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

  const { data: attempts } = await admin
    .from('face_login_attempts')
    .select('failed_count, locked_until')
    .eq('id', true)
    .maybeSingle();

  if (attempts?.locked_until && new Date(attempts.locked_until) > new Date()) {
    return { error: 'Too many failed attempts. Use your password, or try Face ID again later.' };
  }

  const { data: enrolled } = await admin.from('face_descriptors').select('descriptor');

  if (!enrolled || enrolled.length === 0) {
    return { error: 'Face ID isn’t set up yet. Sign in with your password.' };
  }

  const distance = closestDistance(
    captured,
    enrolled.map((row) => row.descriptor as number[]),
  );

  if (distance > FACE_MATCH_THRESHOLD) {
    await recordFailure(admin, attempts?.failed_count ?? 0);
    return { error: 'Face not recognized.' };
  }

  await admin.from('face_login_attempts').upsert({ id: true, failed_count: 0, locked_until: null });

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(ADMIN_UID);
  if (userError || !userData.user?.email) {
    return { error: 'Could not sign in with Face ID right now.' };
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
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
