import { adminClient } from '@/lib/supabase/admin';

/**
 * Whether Face ID is enrolled, and when — never the descriptor itself.
 * `face_credentials` has no SELECT policy for any client-facing role, so
 * even this existence check has to go through the service-role client;
 * nothing about the descriptor leaves the server either way.
 */
export async function getFaceStatus(): Promise<{ enrolled: boolean; enrolledAt: string | null }> {
  const { data } = await adminClient()
    .from('face_credentials')
    .select('enrolled_at')
    .eq('id', true)
    .maybeSingle();

  return { enrolled: Boolean(data), enrolledAt: data?.enrolled_at ?? null };
}
