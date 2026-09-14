'use server';

import { revalidatePath } from 'next/cache';
import { getAdminUser } from '@/lib/supabase/server';
import { ADMIN_UID, adminClient } from '@/lib/supabase/admin';
import { FACE_DESCRIPTOR_LENGTH } from '@/lib/face/constants';

export type EnrollSample = { descriptor: number[]; pose: string };

function isValidDescriptor(descriptor: unknown): descriptor is number[] {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === FACE_DESCRIPTOR_LENGTH &&
    descriptor.every((value) => typeof value === 'number' && Number.isFinite(value))
  );
}

/**
 * face_descriptors has RLS enabled with no policies at all (see migrations
 * 0007/0008), so it is unreachable by every client-facing role — nothing
 * holding a browser session can read the stored views or plant new ones.
 * That makes the service-role client the only way in, which moves the
 * authorisation decision out of RLS and into this explicit check.
 */
async function isAdmin() {
  const user = await getAdminUser();
  return user?.id === ADMIN_UID;
}

export async function enrollFace(samples: EnrollSample[]): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: 'Not authorised.' };

  if (
    !Array.isArray(samples) ||
    samples.length === 0 ||
    !samples.every((sample) => isValidDescriptor(sample?.descriptor))
  ) {
    return { error: 'Invalid face data captured — please try again.' };
  }

  const supabase = adminClient();

  // Replace the whole model rather than adding to it, so a re-scan can't
  // leave stale views from an older enrollment behind.
  await supabase.from('face_descriptors').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { error } = await supabase.from('face_descriptors').insert(
    samples.map((sample) => ({
      descriptor: sample.descriptor,
      pose: typeof sample.pose === 'string' ? sample.pose.slice(0, 40) : null,
    })),
  );

  if (error) return { error: 'Could not save Face ID. Try again.' };

  revalidatePath('/admin/security');
  return {};
}

export async function removeFace(): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: 'Not authorised.' };

  const { error } = await adminClient()
    .from('face_descriptors')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) return { error: 'Could not remove Face ID. Try again.' };

  revalidatePath('/admin/security');
  return {};
}
