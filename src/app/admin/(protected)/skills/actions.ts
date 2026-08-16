'use server';

import { revalidatePath } from 'next/cache';
import { authClient } from '@/lib/supabase/server';

function fields(formData: FormData) {
  const group_key = String(formData.get('group_key') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();
  const discipline = String(formData.get('discipline') ?? 'lead').trim();
  const items = String(formData.get('items') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const sort_order = Number(formData.get('sort_order') ?? 0) || 0;
  return { group_key, label, discipline, items, sort_order };
}

export async function createSkillGroup(formData: FormData): Promise<{ error?: string }> {
  const row = fields(formData);
  if (!row.group_key || !row.label) return { error: 'Key and label are required.' };

  const supabase = await authClient();
  const { error } = await supabase.from('skill_groups').insert(row);
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/admin/skills');
  return {};
}

export async function updateSkillGroup(id: string, formData: FormData): Promise<{ error?: string }> {
  const row = fields(formData);
  if (!row.group_key || !row.label) return { error: 'Key and label are required.' };

  const supabase = await authClient();
  const { error } = await supabase.from('skill_groups').update(row).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/admin/skills');
  return {};
}

export async function deleteSkillGroup(id: string) {
  const supabase = await authClient();
  const { error } = await supabase.from('skill_groups').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/');
  revalidatePath('/admin/skills');
}
