'use server';

import { revalidatePath } from 'next/cache';
import { draftDesignFromImage, type DesignDraft } from '@/lib/ai';
import { processArtwork } from '@/lib/images';
import { authClient } from '@/lib/supabase/server';

export type DraftState = { draft?: DesignDraft; error?: string };

/**
 * Step 1: reads the image and asks Gemini to propose the gallery fields.
 * Nothing is written anywhere — the result only ever lands in the edit form,
 * which is what actually decides whether it gets saved.
 */
export async function draftDesign(_prev: DraftState, formData: FormData): Promise<DraftState> {
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose an image first.' };
  }

  const notes = String(formData.get('notes') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const draft = await draftDesignFromImage(bytes, notes || undefined, title || undefined);
    return { draft };
  } catch (error) {
    console.error('[work] AI drafting failed:', error);
    return { error: 'Could not draft this one automatically — fill the fields in by hand below.' };
  }
}

export type SaveState = { error?: string; slug?: string };

/**
 * Step 2: the admin's own edited fields, plus the same image, become a real
 * row. This is the only place a design actually gets written.
 */
export async function saveDesign(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await authClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Session expired — sign in again.' };

  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'The image is missing — go back and choose it again.' };
  }

  const title = String(formData.get('title') ?? '').trim();
  const context = String(formData.get('context') ?? '').trim();
  const kind = String(formData.get('kind') ?? '').trim();
  const year = String(formData.get('year') ?? '').trim();
  const alt = String(formData.get('alt') ?? '').trim();
  const publish = formData.get('publish') === 'true';

  if (!title || !context) {
    return { error: 'Title and context are required.' };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const processed = await processArtwork(bytes);

    const baseSlug = slugify(title);
    const slug = await uniqueSlug(baseSlug);
    const path = `designs/${slug}.png`;

    const { error: uploadError } = await supabase.storage
      .from('work')
      .upload(path, processed.data, { contentType: 'image/png', upsert: true });
    if (uploadError) throw uploadError;

    const { count } = await supabase
      .from('designs')
      .select('*', { count: 'exact', head: true });

    const { error: insertError } = await supabase.from('designs').insert({
      slug,
      title,
      context,
      kind: kind || 'Design',
      year: year || String(new Date().getFullYear()),
      ratio: processed.ratio,
      image_path: path,
      blur_data_url: processed.blurDataURL,
      alt: alt || `${title} — ${kind || 'design'} for ${context}`,
      published: publish,
      sort_order: count ?? 0,
    });
    if (insertError) throw insertError;

    revalidatePath('/');
    return { slug };
  } catch (error) {
    console.error('[work] save failed:', error);
    return { error: 'Something went wrong saving this — try again.' };
  }
}

/** Flips published without touching anything else. */
export async function togglePublish(id: string, next: boolean) {
  const supabase = await authClient();
  const { error } = await supabase.from('designs').update({ published: next }).eq('id', id);
  if (error) throw error;
  revalidatePath('/');
}

/** Removes the row and, best-effort, its stored image. */
export async function deleteDesign(id: string, imagePath: string | null) {
  const supabase = await authClient();

  if (imagePath) {
    // Best-effort: a storage miss shouldn't block removing the row itself.
    await supabase.storage.from('work').remove([imagePath]).catch(() => {});
  }

  const { error } = await supabase.from('designs').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/');
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Appends -2, -3, … until the slug is free, so titles can repeat safely. */
async function uniqueSlug(base: string): Promise<string> {
  const supabase = await authClient();
  let candidate = base || 'untitled';
  let n = 2;
  for (;;) {
    const { data } = await supabase
      .from('designs')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n++}`;
  }
}
