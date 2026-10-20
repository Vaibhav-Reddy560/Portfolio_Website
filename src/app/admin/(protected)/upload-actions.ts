'use server';

import { randomUUID } from 'node:crypto';
import { adminClient } from '@/lib/supabase/admin';
import { authClient } from '@/lib/supabase/server';

export type UploadTicket = { path?: string; token?: string; error?: string };

/**
 * Mints a one-shot permit to upload a single file straight into Storage.
 *
 * Why this exists: Vercel refuses request bodies over 4.5MB at the edge, before
 * any Server Action runs, so a 35MB original could never be posted to one. The
 * browser uploads it to Supabase directly instead, and the Action afterwards
 * receives only the path — a few dozen bytes. That removes the deployment's
 * ceiling entirely; what remains is Supabase's own per-file limit.
 *
 * The session is checked here, so only the signed-in operator can obtain a
 * ticket. The token it returns is scoped to exactly one random path and is
 * spent by a single upload, which is what lets the browser client stay
 * anonymous and write-less.
 */
export async function createUploadTicket(): Promise<UploadTicket> {
  const supabase = await authClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Session expired — sign in again.' };

  // Minted with the service role rather than the caller's session: the storage
  // policies scope writes to one operator UID, and this keeps issuing a permit
  // independent of how those policies are later tightened. Authorisation has
  // already happened, immediately above.
  const { data, error } = await adminClient()
    .storage.from('work')
    .createSignedUploadUrl(`staging/${randomUUID()}`);

  if (error || !data) {
    console.error('[upload] could not create a signed upload URL:', error);
    return { error: 'Could not start the upload — try again.' };
  }

  return { path: data.path, token: data.token };
}
