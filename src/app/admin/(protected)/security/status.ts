import { adminClient } from '@/lib/supabase/admin';

/**
 * How many views are enrolled and when — never the descriptors themselves.
 * face_descriptors has no policy for any client-facing role, so even this
 * count has to go through the service-role client.
 */
export async function getFaceStatus(): Promise<{
  enrolled: boolean;
  enrolledAt: string | null;
  viewCount: number;
}> {
  const { data } = await adminClient()
    .from('face_descriptors')
    .select('created_at')
    .order('created_at', { ascending: false });

  const rows = data ?? [];
  return {
    enrolled: rows.length > 0,
    enrolledAt: rows[0]?.created_at ?? null,
    viewCount: rows.length,
  };
}
