'use server';

import { revalidatePath } from 'next/cache';
import { draftCaseStudyFromNotes, type CaseStudyDraft } from '@/lib/ai';
import { processArtwork, slugify } from '@/lib/images';
import { authClient } from '@/lib/supabase/server';

export type DraftState = { draft?: CaseStudyDraft; error?: string };

/** Turns rough notes into a structured draft — nothing is saved here. */
export async function draftProject(_prev: DraftState, formData: FormData): Promise<DraftState> {
  const notes = String(formData.get('notes') ?? '').trim();
  if (!notes) return { error: 'Add a few notes about the project first.' };

  try {
    const draft = await draftCaseStudyFromNotes(notes);
    return { draft };
  } catch (error) {
    console.error('[projects] AI drafting failed:', error);
    return { error: 'Could not draft this automatically — fill the fields in by hand below.' };
  }
}

export type SaveState = { error?: string; id?: string };

export async function saveProject(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await authClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Session expired — sign in again.' };

  const id = String(formData.get('id') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Name is required.' };

  const tagline = String(formData.get('tagline') ?? '').trim();
  const year = String(formData.get('year') ?? '').trim();
  const href = String(formData.get('href') ?? '').trim();
  const hrefLabel = String(formData.get('hrefLabel') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const thesis = String(formData.get('thesis') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const stack = String(formData.get('stack') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const published = formData.get('published') === 'true';
  const featured = formData.get('featured') === 'true';

  const detailRaw = String(formData.get('detail') ?? '').trim();
  let detail: unknown = {};
  if (detailRaw) {
    try {
      detail = JSON.parse(detailRaw);
    } catch {
      return { error: 'The detail field is not valid JSON.' };
    }
  }

  const row: Record<string, unknown> = {
    name,
    tagline: tagline || null,
    year: year || null,
    href: href || null,
    href_label: hrefLabel || null,
    summary: summary || null,
    thesis: thesis || null,
    note: note || null,
    stack,
    detail,
    published,
    featured,
  };

  const file = formData.get('image');

  try {
    if (file instanceof File && file.size > 0) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const processed = await processArtwork(bytes, { trim: false });
      const path = `projects/${id || slugify(name)}/product.webp`;
      const { error: uploadError } = await supabase.storage
        .from('work')
        .upload(path, processed.data, { contentType: 'image/webp', upsert: true });
      if (uploadError) throw uploadError;
      row.image_path = path;
      row.blur_data_url = processed.blurDataURL;
    }

    if (id) {
      const { error } = await supabase.from('projects').update(row).eq('id', id);
      if (error) throw error;
      revalidatePath('/');
      revalidatePath('/admin/projects');
      return { id };
    }

    const baseSlug = slugify(name);
    const slug = await uniqueSlug(baseSlug);
    const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });

    const { data: inserted, error } = await supabase
      .from('projects')
      .insert({ ...row, slug, sort_order: count ?? 0 })
      .select('id')
      .single();
    if (error) throw error;

    revalidatePath('/');
    revalidatePath('/admin/projects');
    return { id: inserted.id };
  } catch (error) {
    console.error('[projects] save failed:', error);
    return { error: 'Something went wrong saving this — try again.' };
  }
}

export async function togglePublish(id: string, next: boolean) {
  const supabase = await authClient();
  const { error } = await supabase.from('projects').update({ published: next }).eq('id', id);
  if (error) throw error;
  revalidatePath('/');
}

export async function deleteProject(id: string, imagePath: string | null) {
  const supabase = await authClient();
  if (imagePath) {
    await supabase.storage.from('work').remove([imagePath]).catch(() => {});
  }
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/');
}

async function uniqueSlug(base: string): Promise<string> {
  const supabase = await authClient();
  let candidate = base || 'untitled';
  let n = 2;
  for (;;) {
    const { data } = await supabase.from('projects').select('slug').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n++}`;
  }
}
