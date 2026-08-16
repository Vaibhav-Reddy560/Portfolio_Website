'use server';

import { revalidatePath } from 'next/cache';
import { authClient } from '@/lib/supabase/server';

function fields(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const org = String(formData.get('org') ?? '').trim();
  const sub = String(formData.get('sub') ?? '').trim();
  const start_label = String(formData.get('start_label') ?? '').trim();
  const end_label = String(formData.get('end_label') ?? '').trim();
  const detail = String(formData.get('detail') ?? '').trim();
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const is_additional = formData.get('is_additional') === 'true';
  const published = formData.get('published') !== 'false';
  const sort_order = Number(formData.get('sort_order') ?? 0) || 0;

  return { title, org, sub: sub || null, start_label: start_label || null, end_label: end_label || null, detail: detail || null, tags, is_additional, published, sort_order };
}

export async function createExperience(formData: FormData): Promise<{ error?: string }> {
  const row = fields(formData);
  if (!row.title) return { error: 'Title is required.' };

  const supabase = await authClient();
  const { error } = await supabase.from('experience').insert(row);
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/admin/experience');
  return {};
}

export async function updateExperience(id: string, formData: FormData): Promise<{ error?: string }> {
  const row = fields(formData);
  if (!row.title) return { error: 'Title is required.' };

  const supabase = await authClient();
  const { error } = await supabase.from('experience').update(row).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/admin/experience');
  return {};
}

export async function deleteExperience(id: string) {
  const supabase = await authClient();
  const { error } = await supabase.from('experience').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/');
  revalidatePath('/admin/experience');
}
