'use server';

import { revalidatePath } from 'next/cache';
import { authClient } from '@/lib/supabase/server';
import { FACE_DESCRIPTOR_LENGTH } from '@/lib/face/constants';

function isValidDescriptor(descriptor: unknown): descriptor is number[] {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === FACE_DESCRIPTOR_LENGTH &&
    descriptor.every((value) => typeof value === 'number' && Number.isFinite(value))
  );
}

export async function enrollFace(descriptor: number[]): Promise<{ error?: string }> {
  if (!isValidDescriptor(descriptor)) {
    return { error: 'Invalid face data captured — please try again.' };
  }

  // RLS on face_credentials only permits writes from the admin's own
  // session (see supabase/migrations/0006_face_id.sql) — this call fails
  // for anyone else, the same guarantee every other admin write relies on.
  const supabase = await authClient();
  const { error } = await supabase
    .from('face_credentials')
    .upsert({ id: true, descriptor, enrolled_at: new Date().toISOString() });

  if (error) return { error: 'Could not save Face ID. Try again.' };

  revalidatePath('/admin/security');
  return {};
}

export async function removeFace(): Promise<{ error?: string }> {
  const supabase = await authClient();
  const { error } = await supabase.from('face_credentials').delete().eq('id', true);

  if (error) return { error: 'Could not remove Face ID. Try again.' };

  revalidatePath('/admin/security');
  return {};
}
