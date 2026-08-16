'use server';

import { revalidatePath } from 'next/cache';
import { authClient } from '@/lib/supabase/server';

function fields(formData: FormData) {
  const qualification = String(formData.get('qualification') ?? '').trim();
  const institution = String(formData.get('institution') ?? '').trim();
  const period = String(formData.get('period') ?? '').trim();
  const place = String(formData.get('place') ?? '').trim();
  const is_current = formData.get('is_current') === 'true';
  const sort_order = Number(formData.get('sort_order') ?? 0) || 0;
  return { qualification, institution, period: period || null, place: place || null, is_current, sort_order };
}

export async function createEducation(formData: FormData): Promise<{ error?: string }> {
  const row = fields(formData);
  if (!row.qualification) return { error: 'Qualification is required.' };

  const supabase = await authClient();
  const { error } = await supabase.from('education').insert(row);
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/admin/education');
  return {};
}

export async function updateEducation(id: string, formData: FormData): Promise<{ error?: string }> {
  const row = fields(formData);
  if (!row.qualification) return { error: 'Qualification is required.' };

  const supabase = await authClient();
  const { error } = await supabase.from('education').update(row).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/admin/education');
  return {};
}

export async function deleteEducation(id: string) {
  const supabase = await authClient();
  const { error } = await supabase.from('education').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/');
  revalidatePath('/admin/education');
}
